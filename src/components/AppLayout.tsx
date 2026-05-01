import React, { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { AustralianBillData, getBillingCycleFromDays } from '@/types/BillData';
import { useAppContext } from '@/contexts/AppContext';
import { QualifierData } from './CustomerQualifiers';
import Header from './Header';
import UploadSection from './UploadSection';
import Dashboard from './Dashboard';
import BillHistory from './BillHistory';
import PiComparison from './PiComparison';
import ForwardProjection from './ForwardProjection';
import EligibilityScreen from './EligibilityScreen';
import ManualBillEntry from './ManualBillEntry';

type ActiveSection = 'upload' | 'analysis' | 'history' | 'comparison' | 'projection' | 'manual-entry';

interface UploadStatus {
  progress: number;
  status: 'uploading' | 'analyzing' | 'complete' | 'error';
  error?: string;
  suggestManualEntry?: boolean;
}

const AppLayout: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    qualifiers, 
    setQualifiers, 
    isEligible, 
    setIsEligible,
    bills: contextBills,
    setBills: setContextBills,
    loadSessionByCode,
    sessionCode: currentSessionCode
  } = useAppContext();
  const [activeSection, setActiveSection] = useState<ActiveSection>('upload');
  const [bills, setBillsLocal] = useState<AustralianBillData[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadStatus>>(new Map());
  const [showServiceUnavailableModal, setShowServiceUnavailableModal] = useState(false);
  const [sessionLoadAttempted, setSessionLoadAttempted] = useState(false);

  // Check for session query parameter and load session if present
  useEffect(() => {
    const sessionCodeFromUrl = searchParams.get('session');
    if (sessionCodeFromUrl && !sessionLoadAttempted) {
      setSessionLoadAttempted(true);
      // Load the session by code
      loadSessionByCode(sessionCodeFromUrl).then((success) => {
        if (success) {
          // Clear the query parameter after loading
          setSearchParams({});
        }
      });
    }
  }, [searchParams, loadSessionByCode, setSearchParams, sessionLoadAttempted]);

  // Sync local bills with context
  useEffect(() => {
    if (contextBills.length > 0 && bills.length === 0) {
      setBillsLocal(contextBills);
    }
  }, [contextBills]);

  // Update context when local bills change
  const setBills = useCallback((newBills: AustralianBillData[] | ((prev: AustralianBillData[]) => AustralianBillData[])) => {
    setBillsLocal(prev => {
      const updated = typeof newBills === 'function' ? newBills(prev) : newBills;
      setContextBills(updated);
      return updated;
    });
  }, [setContextBills]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleBillUpload = useCallback(async (files: File[]) => {
    // Initialize upload status for all files
    const newUploadingFiles = new Map<string, UploadStatus>();
    files.forEach(file => {
      newUploadingFiles.set(file.name, { progress: 0, status: 'uploading' });
    });
    setUploadingFiles(newUploadingFiles);

    let serviceUnavailable = false;

    // Process files sequentially to avoid overwhelming the API
    for (const file of files) {
      try {
        // Update status to uploading
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.set(file.name, { progress: 20, status: 'uploading' });
          return updated;
        });

        // Convert to base64
        const imageBase64 = await fileToBase64(file);

        // Update status to analyzing
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.set(file.name, { progress: 50, status: 'analyzing' });
          return updated;
        });

        // Call the edge function
        const { data, error } = await supabase.functions.invoke('analyze-energy-bill', {
          body: {
            imageBase64,
            mimeType: file.type,
            fileName: file.name
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to analyze bill');
        }

        // Check for service unavailable error
        if (!data.success) {
          if (data.errorCode === 'AI_SERVICE_UNAVAILABLE' || data.suggestManualEntry) {
            serviceUnavailable = true;
            setUploadingFiles(prev => {
              const updated = new Map(prev);
              updated.set(file.name, { 
                progress: 0, 
                status: 'error', 
                error: 'AI service unavailable - use manual entry',
                suggestManualEntry: true
              });
              return updated;
            });
            continue; // Skip to next file
          }
          throw new Error(data.error || 'Failed to analyze bill');
        }

        // Create the new bill from the extracted data
        const extractedData = data.data;
        
        // Calculate billing days if not provided
        let billingDays = extractedData.billingDays;
        if (!billingDays && extractedData.billingPeriodStart && extractedData.billingPeriodEnd) {
          const startParts = extractedData.billingPeriodStart.split('/');
          const endParts = extractedData.billingPeriodEnd.split('/');
          if (startParts.length === 3 && endParts.length === 3) {
            const startDate = new Date(parseInt(startParts[2]), parseInt(startParts[1]) - 1, parseInt(startParts[0]));
            const endDate = new Date(parseInt(endParts[2]), parseInt(endParts[1]) - 1, parseInt(endParts[0]));
            billingDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        billingDays = billingDays || 30; // Default to 30 if still not calculated

        // Determine billing cycle from days
        const billingCycle = getBillingCycleFromDays(billingDays);

        // Calculate average daily kWh
        const averageDailyKwh = billingDays > 0 ? extractedData.gridImportKwh / billingDays : 0;

        // Determine energy source
        const energySource = extractedData.hasSolar 
          ? (extractedData.solarExportKwh > 0 ? 'MIXED' : 'GRID')
          : 'GRID';

        const newBill: AustralianBillData = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          fileName: file.name,
          uploadDate: new Date().toISOString().split('T')[0],
          
          nmi: extractedData.nmi || '',
          retailer: extractedData.retailer || '',
          customerName: extractedData.customerName || '',
          serviceAddress: extractedData.serviceAddress || '',
          accountNumber: extractedData.accountNumber || '',
          
          billingPeriodStart: extractedData.billingPeriodStart || '',
          billingPeriodEnd: extractedData.billingPeriodEnd || '',
          billingDays: billingDays,
          billingCycle: billingCycle,
          
          totalUsageKwh: extractedData.totalUsageKwh || 0,
          gridImportKwh: extractedData.gridImportKwh || 0,
          solarExportKwh: extractedData.solarExportKwh || 0,
          averageDailyKwh: averageDailyKwh,
          
          energySource: energySource,
          
          tariffType: extractedData.tariffType || 'FIXED',
          peakUsageKwh: extractedData.peakUsageKwh || 0,
          offPeakUsageKwh: extractedData.offPeakUsageKwh || 0,
          shoulderUsageKwh: extractedData.shoulderUsageKwh || 0,
          controlledLoadKwh: extractedData.controlledLoadKwh || 0,
          
          peakRateCentsKwh: extractedData.peakRateCentsKwh || 0,
          offPeakRateCentsKwh: extractedData.offPeakRateCentsKwh || 0,
          shoulderRateCentsKwh: extractedData.shoulderRateCentsKwh || 0,
          controlledLoadRateCentsKwh: extractedData.controlledLoadRateCentsKwh || 0,
          singleRateCentsKwh: extractedData.singleRateCentsKwh || 0,
          feedInTariffCentsKwh: extractedData.feedInTariffCentsKwh || 0,
          dailySupplyChargeCents: extractedData.dailySupplyChargeCents || 0,
          
          usageCharges: extractedData.usageCharges || 0,
          supplyCharges: extractedData.supplyCharges || 0,
          solarCredits: extractedData.solarCredits || 0,
          discounts: extractedData.discounts || 0,
          gst: extractedData.gst || 0,
          totalAmount: extractedData.totalAmount || 0,
          
          powerPhases: extractedData.powerPhases || 1,
          hasSolar: extractedData.hasSolar || false,
          solarSystemSize: extractedData.solarSystemSize || null,
          
          dueDate: extractedData.dueDate || ''
        };

        // Add the bill to state
        setBills(prev => [newBill, ...prev]);

        // Update status to complete
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.set(file.name, { progress: 100, status: 'complete' });
          return updated;
        });

      } catch (error: any) {
        console.error('Error analyzing bill:', error);
        
        // Check if this is a service unavailable error
        const errorMessage = error.message || '';
        if (errorMessage.includes('503') || errorMessage.includes('unavailable') || errorMessage.includes('non-2xx')) {
          serviceUnavailable = true;
        }
        
        setUploadingFiles(prev => {
          const updated = new Map(prev);
          updated.set(file.name, { 
            progress: 0, 
            status: 'error', 
            error: serviceUnavailable ? 'AI service unavailable - use manual entry' : (error.message || 'Failed to analyze bill'),
            suggestManualEntry: serviceUnavailable
          });
          return updated;
        });
      }
    }

    // Show modal if service was unavailable
    if (serviceUnavailable) {
      setShowServiceUnavailableModal(true);
    }

    // Clear completed uploads after a delay
    setTimeout(() => {
      setUploadingFiles(prev => {
        const updated = new Map(prev);
        for (const [key, value] of updated.entries()) {
          if (value.status === 'complete') {
            updated.delete(key);
          }
        }
        return updated;
      });
      
      // Navigate to analysis if we have bills
      if (bills.length > 0 || files.length > 0) {
        setActiveSection('analysis');
      }
    }, 2000);
  }, [bills.length, setBills]);

  // Handle manual bill entry - adds bill but keeps modal open for more
  const handleManualBillSave = useCallback((billData: AustralianBillData) => {
    setBills(prev => [billData, ...prev]);
    setActiveSection('analysis');
  }, [setBills]);

  // Handle save and add another - adds bill but keeps modal open
  const handleManualBillSaveAndAddAnother = useCallback((billData: AustralianBillData) => {
    setBills(prev => [billData, ...prev]);
    // Don't change section - keep modal open
  }, [setBills]);


  // Handle eligibility completion
  const handleEligible = useCallback((completedQualifiers: QualifierData) => {
    setQualifiers(completedQualifiers);
    setIsEligible(true);
  }, [setQualifiers, setIsEligible]);

  // Handle loading a saved session
  const handleLoadSession = useCallback((loadedBills: AustralianBillData[]) => {
    setBills(loadedBills);
    if (loadedBills.length > 0) {
      setActiveSection('analysis');
    }
  }, [setBills]);

  const handleDeleteBill = useCallback((id: string) => {
    setBills(prev => prev.filter(bill => bill.id !== id));
  }, [setBills]);

  // Show eligibility screen if not yet eligible
  if (!isEligible) {
    return (
      <EligibilityScreen 
        onEligible={handleEligible}
        onUpdateQualifiers={setQualifiers}
        qualifiers={qualifiers}
      />
    );
  }


  // Main app layout (only shown after eligibility is confirmed)
  return (
    <div className="min-h-screen bg-slate-900">
      <Header 
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        bills={bills}
        onLoadSession={handleLoadSession}
      />
      
      {/* Service Unavailable Modal */}
      {showServiceUnavailableModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Service Temporarily Unavailable</h3>
              <p className="text-slate-400 mb-6">
                The automatic bill analysis service is currently unavailable. You can enter your bill details manually instead.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowServiceUnavailableModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Try Again Later
                </button>
                <button
                  onClick={() => {
                    setShowServiceUnavailableModal(false);
                    setActiveSection('manual-entry');
                  }}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  Enter Manually
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {activeSection === 'manual-entry' && (
        <ManualBillEntry
          onSave={(bill) => {
            handleManualBillSave(bill);
            setShowServiceUnavailableModal(false);
          }}
          onSaveAndAddAnother={handleManualBillSaveAndAddAnother}
          onCancel={() => {
            // If we have bills, go to analysis, otherwise go to upload
            if (bills.length > 0) {
              setActiveSection('analysis');
            } else {
              setActiveSection('upload');
            }
          }}
        />
      )}
      
      <main>
        {activeSection === 'upload' && (
          <UploadSection 
            onUpload={handleBillUpload}
            uploadingFiles={uploadingFiles}
            bills={bills}
            onManualEntry={() => setActiveSection('manual-entry')}
          />
        )}


        {activeSection === 'analysis' && bills.length > 0 && (
          <Dashboard bills={bills} />
        )}
        
        {activeSection === 'analysis' && bills.length === 0 && (
          <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-400 text-lg mb-4">No bills uploaded yet</p>
              <button 
                onClick={() => setActiveSection('upload')}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Upload Bills
              </button>
            </div>
          </div>
        )}
        
        {activeSection === 'history' && (
          <BillHistory 
            bills={bills} 
            onDeleteBill={handleDeleteBill}
          />
        )}
        
        {activeSection === 'comparison' && bills.length > 0 && (
          <PiComparison bills={bills} />
        )}
        
        {activeSection === 'comparison' && bills.length === 0 && (
          <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-400 text-lg mb-4">Upload bills to see Pi Energy comparison</p>
              <button 
                onClick={() => setActiveSection('upload')}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Upload Bills
              </button>
            </div>
          </div>
        )}

        {activeSection === 'projection' && bills.length > 0 && (
          <ForwardProjection bills={bills} />
        )}
        
        {activeSection === 'projection' && bills.length === 0 && (
          <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
            <div className="text-center">
              <p className="text-slate-400 text-lg mb-4">Upload bills to see forward cost projections</p>
              <button 
                onClick={() => setActiveSection('upload')}
                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Upload Bills
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AppLayout;
