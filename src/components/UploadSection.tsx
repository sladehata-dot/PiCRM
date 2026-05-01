import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Image, File, Calendar, Zap, DollarSign, Clock, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AustralianBillData, getBillingCycleDisplay } from '@/types/BillData';
import SaveLoadSession from './SaveLoadSession';

interface UploadSectionProps {
  onUpload: (files: File[]) => void;
  uploadingFiles: Map<string, { progress: number; status: 'uploading' | 'analyzing' | 'complete' | 'error'; error?: string }>;
  bills: AustralianBillData[];
  onLoadSession?: (bills: AustralianBillData[]) => void;
  onManualEntry?: () => void;
}

// Parse date string in DD/MM/YYYY format
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Format short date
const formatShortDate = (dateStr: string): string => {
  const date = parseDate(dateStr);
  if (!date) return dateStr;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
};

const UploadSection: React.FC<UploadSectionProps> = ({ onUpload, uploadingFiles, bills, onManualEntry }) => {

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billCount = bills.length;

  // Calculate coverage data from bills
  const coverageData = useMemo(() => {
    if (bills.length === 0) {
      return {
        totalDays: 0,
        coveragePercent: 0,
        dateRange: null,
        sortedBills: [] as AustralianBillData[],
        gaps: [] as { start: Date; end: Date; days: number }[]
      };
    }

    // Sort bills by start date
    const sortedBills = [...bills].sort((a, b) => {
      const dateA = parseDate(a.billingPeriodStart);
      const dateB = parseDate(b.billingPeriodStart);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate total days covered
    let totalDays = 0;
    const coveredPeriods: { start: Date; end: Date }[] = [];
    
    sortedBills.forEach(bill => {
      const start = parseDate(bill.billingPeriodStart);
      const end = parseDate(bill.billingPeriodEnd);
      if (start && end) {
        totalDays += bill.billingDays || Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        coveredPeriods.push({ start, end });
      }
    });

    // Find gaps between bills
    const gaps: { start: Date; end: Date; days: number }[] = [];
    for (let i = 0; i < coveredPeriods.length - 1; i++) {
      const currentEnd = coveredPeriods[i].end;
      const nextStart = coveredPeriods[i + 1].start;
      const gapDays = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24));
      if (gapDays > 1) {
        gaps.push({
          start: new Date(currentEnd.getTime() + 86400000),
          end: new Date(nextStart.getTime() - 86400000),
          days: gapDays - 1
        });
      }
    }

    // Get date range
    const firstBill = sortedBills[0];
    const lastBill = sortedBills[sortedBills.length - 1];

    // Calculate coverage percentage (target is 365 days)
    const coveragePercent = Math.min((totalDays / 365) * 100, 100);

    return {
      totalDays,
      coveragePercent,
      dateRange: {
        start: firstBill.billingPeriodStart,
        end: lastBill.billingPeriodEnd
      },
      sortedBills,
      gaps
    };
  }, [bills]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type === 'application/pdf'
    );
    
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(file => 
        file.type.startsWith('image/') || file.type === 'application/pdf'
      );
      setSelectedFiles(prev => [...prev, ...files]);
    }
  }, []);

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-400" />;
    }
    return <Image className="w-5 h-5 text-blue-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getBillingCycleColor = (cycle: string) => {
    switch (cycle) {
      case 'MONTHLY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'BI_MONTHLY': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'QUARTERLY': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Upload Energy Bills</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Upload your Australian energy bills (PDF or images) for analysis. 
            We recommend uploading bills covering <span className="text-cyan-400 font-semibold">12 months</span> for comprehensive analysis.
          </p>
        </div>

        {/* What We Extract */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 rounded-xl p-6 mb-6 border border-cyan-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">What We Extract From Your Bills</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Billing Period</p>
                <p className="text-xs text-slate-400">Date ranges & cycle type (monthly/quarterly)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Usage Data</p>
                <p className="text-xs text-slate-400">Daily avg kWh, grid/solar, TOU breakdown</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Rates & Tariffs</p>
                <p className="text-xs text-slate-400">Fixed/TOU rates, supply charges, FiT</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Account Details</p>
                <p className="text-xs text-slate-400">NMI, retailer, power phases, solar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coverage Progress Card - Dynamic based on uploaded bills */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Coverage Progress</h3>
              <p className="text-sm text-slate-400">
                {billCount === 0 
                  ? 'Upload bills to start building your coverage'
                  : coverageData.totalDays >= 365
                    ? 'Full year coverage achieved!'
                    : `${365 - coverageData.totalDays} more days needed for full 12-month analysis`
                }
              </p>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${coverageData.coveragePercent >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {coverageData.totalDays} days
              </div>
              <div className="text-xs text-slate-500">of 365 target</div>
            </div>
          </div>

          {/* Progress bar based on days covered */}
          <div className="relative mb-4">
            <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  coverageData.coveragePercent >= 100 ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${coverageData.coveragePercent}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>0 days</span>
              <span>182 days (6 months)</span>
              <span>365 days (12 months)</span>
            </div>
          </div>

          {/* Uploaded Bills Timeline */}
          {billCount > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Uploaded Bill Periods ({billCount} bill{billCount !== 1 ? 's' : ''})
              </h4>
              
              <div className="space-y-2">
                {coverageData.sortedBills.map((bill, index) => (
                  <div 
                    key={bill.id}
                    className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3 border border-slate-600/50"
                  >
                    {/* Bill number indicator */}
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 font-bold text-sm">{index + 1}</span>
                    </div>
                    
                    {/* Date range */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {formatDate(bill.billingPeriodStart)}
                        </span>
                        <span className="text-slate-500">—</span>
                        <span className="text-white font-medium">
                          {formatDate(bill.billingPeriodEnd)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span>{bill.billingDays} days</span>
                        <span>•</span>
                        <span>{bill.retailer || 'Unknown retailer'}</span>
                        <span>•</span>
                        <span>{bill.gridImportKwh.toFixed(0)} kWh</span>
                      </div>
                    </div>
                    
                    {/* Billing cycle badge */}
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getBillingCycleColor(bill.billingCycle)}`}>
                      {getBillingCycleDisplay(bill.billingCycle)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coverage gaps warning */}
              {coverageData.gaps.length > 0 && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">Coverage gaps detected</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {coverageData.gaps.map((gap, i) => (
                          <span key={i}>
                            {i > 0 && ', '}
                            {gap.days} days ({gap.start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - {gap.end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })})
                          </span>
                        ))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date range summary */}
              {coverageData.dateRange && (
                <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total coverage period:</span>
                    <span className="text-white font-medium">
                      {formatDate(coverageData.dateRange.start)} — {formatDate(coverageData.dateRange.end)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {billCount === 0 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">No bills uploaded yet</p>
              <p className="text-slate-500 text-xs mt-1">
                Upload your first bill to see coverage details
              </p>
            </div>
          )}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-cyan-500 bg-cyan-500/10' 
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${isDragging ? 'bg-cyan-500/20' : 'bg-slate-700'}`}>
            <Upload className={`w-8 h-8 ${isDragging ? 'text-cyan-400' : 'text-slate-400'}`} />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragging ? 'Drop files here' : 'Drag & drop energy bills'}
          </h3>
          <p className="text-slate-400 mb-4">
            or click to browse your files
          </p>
          <p className="text-sm text-slate-500">
            Supports PDF, PNG, JPG, JPEG (max 10MB each)
          </p>
        </div>

        {/* Manual Entry Option */}
        {onManualEntry && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onManualEntry();
              }}
              className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-slate-600"
            >
              <PenLine className="w-5 h-5 text-cyan-400" />
              <span>Enter Bill Details Manually</span>
            </button>
          </div>
        )}


        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-medium">Selected Files ({selectedFiles.length})</h4>
              <Button 
                onClick={handleUpload}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload & Analyze
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {getFileIcon(file)}
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[200px] sm:max-w-[400px]">
                        {file.name}
                      </p>
                      <p className="text-slate-400 text-xs">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                    className="p-1 hover:bg-slate-600 rounded"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uploading Files */}
        {uploadingFiles.size > 0 && (
          <div className="mt-6 bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h4 className="text-white font-medium mb-4">Processing Bills</h4>
            <div className="space-y-3">
              {Array.from(uploadingFiles.entries()).map(([fileName, status]) => (
                <div key={fileName} className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <File className="w-5 h-5 text-slate-400" />
                      <span className="text-white text-sm truncate max-w-[200px] sm:max-w-[300px]">
                        {fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {status.status === 'uploading' && (
                        <span className="text-xs text-cyan-400">Uploading...</span>
                      )}
                      {status.status === 'analyzing' && (
                        <span className="text-xs text-amber-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Extracting data...
                        </span>
                      )}
                      {status.status === 'complete' && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Complete
                        </span>
                      )}
                      {status.status === 'error' && (
                        <span className="text-xs text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                  <Progress value={status.progress} className="h-1" />
                  {status.error && (
                    <p className="text-xs text-red-400 mt-2">{status.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center mb-3">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Clear Images</h4>
            <p className="text-sm text-slate-400">
              Ensure bills are clearly visible with all text readable
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <h4 className="text-white font-medium mb-1">Full Bills</h4>
            <p className="text-sm text-slate-400">
              Include all pages showing NMI, usage, rates, and charges
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
            <h4 className="text-white font-medium mb-1">365 Days Coverage</h4>
            <p className="text-sm text-slate-400">
              Monthly or quarterly bills covering a full year
            </p>
          </div>
        </div>

        {/* Australian Retailers Info */}
        <div className="mt-8 bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
          <h4 className="text-white font-medium mb-3">Supported Australian Energy Retailers</h4>
          <p className="text-sm text-slate-400 mb-4">
            Our AI can extract data from bills of all major Australian energy retailers including:
          </p>
          <div className="flex flex-wrap gap-2">
            {['AGL', 'Origin Energy', 'EnergyAustralia', 'Red Energy', 'Alinta Energy', 'Simply Energy', 
              'Powershop', 'Lumo Energy', 'Momentum Energy', 'Dodo Power', 'Sumo', 'Amber Electric',
              'Ergon Energy', 'Ausgrid', 'Synergy', 'ActewAGL', 'Aurora Energy'].map(retailer => (
              <span key={retailer} className="text-xs px-3 py-1 bg-slate-700/50 text-slate-300 rounded-full">
                {retailer}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
