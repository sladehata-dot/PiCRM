import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { QualifierData } from '@/components/CustomerQualifiers';
import { AustralianBillData, YearlyAnalysis, CustomerProfile } from '@/types/BillData';
import {
  CustomerSession,
  createSession,
  getSessionByCode,
  getSessionById,
  saveFullSession,
  updateSessionStatus,
  SessionStatus,
} from '@/lib/sessionService';

const defaultQualifiers: QualifierData = {
  postcode: null,
  isPropertyOwner: null,
  propertyType: null,
  propertyStatus: null,
  numberOfResidents: null,
  residentsLikelyToChange: null,
  likelyToSellIn5Years: null,
  hasEV: null,
  evPlanTimeline: null,
  hasSolar: null,
  solarAge: null,
  hasHomeBattery: null,
};

// Customer contact info interface
export interface CustomerContactInfo {
  name: string;
  email: string;
  phone: string;
}

const defaultContactInfo: CustomerContactInfo = {
  name: '',
  email: '',
  phone: '',
};

interface AppContextType {
  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Eligibility & Qualifiers
  qualifiers: QualifierData;
  setQualifiers: (qualifiers: QualifierData) => void;
  isEligible: boolean;
  setIsEligible: (eligible: boolean) => void;
  resetEligibility: () => void;
  
  // Customer Contact Info
  customerContactInfo: CustomerContactInfo;
  setCustomerContactInfo: (info: CustomerContactInfo) => void;
  
  // Session Management
  currentSession: CustomerSession | null;
  sessionCode: string | null;
  isSessionLoading: boolean;
  sessionError: string | null;
  
  // Session Actions
  startNewSession: (contactInfo?: CustomerContactInfo) => Promise<string | null>;
  loadSessionByCode: (code: string) => Promise<boolean>;
  saveSession: (contactInfo?: CustomerContactInfo) => Promise<boolean>;

  
  // Bill Data (for session persistence)
  bills: AustralianBillData[];
  setBills: (bills: AustralianBillData[]) => void;
  
  // Analysis Data
  yearlyAnalysis: YearlyAnalysis | null;
  setYearlyAnalysis: (analysis: YearlyAnalysis | null) => void;
  customerProfile: CustomerProfile | null;
  setCustomerProfile: (profile: CustomerProfile | null) => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  toggleSidebar: () => {},
  qualifiers: defaultQualifiers,
  setQualifiers: () => {},
  isEligible: false,
  setIsEligible: () => {},
  resetEligibility: () => {},
  customerContactInfo: defaultContactInfo,
  setCustomerContactInfo: () => {},
  currentSession: null,
  sessionCode: null,
  isSessionLoading: false,
  sessionError: null,
  startNewSession: async () => null,
  loadSessionByCode: async () => false,
  saveSession: async () => false,
  bills: [],
  setBills: () => {},
  yearlyAnalysis: null,
  setYearlyAnalysis: () => {},
  customerProfile: null,
  setCustomerProfile: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Session state
  const [currentSession, setCurrentSession] = useState<CustomerSession | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(() => {
    return localStorage.getItem('piEnergySessionCode');
  });
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // Use a ref to track the current session ID synchronously
  // This avoids race conditions where state hasn't updated yet
  const currentSessionIdRef = useRef<string | null>(null);
  
  // Qualifiers state
  const [qualifiers, setQualifiersState] = useState<QualifierData>(() => {
    const saved = localStorage.getItem('customerQualifiers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultQualifiers;
      }
    }
    return defaultQualifiers;
  });

  const [isEligible, setIsEligibleState] = useState<boolean>(() => {
    const saved = localStorage.getItem('piEnergyEligible');
    return saved === 'true';
  });
  
  // Customer contact info state
  const [customerContactInfo, setCustomerContactInfoState] = useState<CustomerContactInfo>(() => {
    const saved = localStorage.getItem('piEnergyContactInfo');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultContactInfo;
      }
    }
    return defaultContactInfo;
  });
  
  // Bill data state
  const [bills, setBillsState] = useState<AustralianBillData[]>(() => {
    const saved = localStorage.getItem('piEnergyBills');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // Analysis state
  const [yearlyAnalysis, setYearlyAnalysisState] = useState<YearlyAnalysis | null>(null);
  const [customerProfile, setCustomerProfileState] = useState<CustomerProfile | null>(null);
  
  // Auto-save debounce ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);
  
  // Refs for current values (to avoid stale closures)
  const qualifiersRef = useRef(qualifiers);
  const isEligibleRef = useRef(isEligible);
  const billsRef = useRef(bills);
  const yearlyAnalysisRef = useRef(yearlyAnalysis);
  const customerProfileRef = useRef(customerProfile);
  const customerContactInfoRef = useRef(customerContactInfo);
  
  // Keep refs in sync with state
  useEffect(() => { qualifiersRef.current = qualifiers; }, [qualifiers]);
  useEffect(() => { isEligibleRef.current = isEligible; }, [isEligible]);
  useEffect(() => { billsRef.current = bills; }, [bills]);
  useEffect(() => { yearlyAnalysisRef.current = yearlyAnalysis; }, [yearlyAnalysis]);
  useEffect(() => { customerProfileRef.current = customerProfile; }, [customerProfile]);
  useEffect(() => { customerContactInfoRef.current = customerContactInfo; }, [customerContactInfo]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Load existing session on mount if session code exists
  useEffect(() => {
    const loadExistingSession = async () => {
      if (sessionCode && !currentSession) {
        setIsSessionLoading(true);
        const result = await getSessionByCode(sessionCode);
        setIsSessionLoading(false);
        
        if (result.success && result.session) {
          setCurrentSession(result.session);
          currentSessionIdRef.current = result.session.id;
          
          // Restore state from session
          if (result.session.qualifiers) {
            setQualifiersState(result.session.qualifiers);
          }
          if (result.session.isEligible !== null) {
            setIsEligibleState(result.session.isEligible);
          }
          if (result.session.bills && result.session.bills.length > 0) {
            setBillsState(result.session.bills);
          }
          if (result.session.yearlyAnalysis) {
            setYearlyAnalysisState(result.session.yearlyAnalysis);
          }
          if (result.session.customerProfile) {
            setCustomerProfileState(result.session.customerProfile);
          }
          // Restore customer contact info from session
          if (result.session.customerName || result.session.customerEmail || result.session.customerPhone) {
            setCustomerContactInfoState({
              name: result.session.customerName || '',
              email: result.session.customerEmail || '',
              phone: result.session.customerPhone || '',
            });
          }
        } else {
          // Invalid session code, clear it
          localStorage.removeItem('piEnergySessionCode');
          setSessionCode(null);
          currentSessionIdRef.current = null;
        }
      }
    };
    
    loadExistingSession();
  }, []);

  // Auto-save session when data changes
  const autoSaveSession = useCallback(async () => {
    const sessionId = currentSessionIdRef.current;
    if (!sessionId || !hasChangesRef.current) return;
    
    const result = await saveFullSession(sessionId, {
      qualifiers: qualifiersRef.current,
      isEligible: isEligibleRef.current,
      bills: billsRef.current,
      yearlyAnalysis: yearlyAnalysisRef.current || undefined,
      customerProfile: customerProfileRef.current || undefined,
      customerName: customerContactInfoRef.current.name || undefined,
      customerEmail: customerContactInfoRef.current.email || undefined,
      customerPhone: customerContactInfoRef.current.phone || undefined,
      status: isEligibleRef.current ? 'eligible' : (qualifiersRef.current.postcode ? 'in_progress' : 'in_progress'),
    });
    
    if (result.success && result.session) {
      setCurrentSession(result.session);
      hasChangesRef.current = false;
    }
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (currentSessionIdRef.current && hasChangesRef.current) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        autoSaveSession();
      }, 2000); // Save after 2 seconds of inactivity
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [qualifiers, isEligible, bills, yearlyAnalysis, customerProfile, customerContactInfo, autoSaveSession]);

  const setQualifiers = (newQualifiers: QualifierData) => {
    setQualifiersState(newQualifiers);
    localStorage.setItem('customerQualifiers', JSON.stringify(newQualifiers));
    hasChangesRef.current = true;
  };

  const setIsEligible = (eligible: boolean) => {
    setIsEligibleState(eligible);
    localStorage.setItem('piEnergyEligible', eligible ? 'true' : 'false');
    hasChangesRef.current = true;
  };
  
  const setCustomerContactInfo = (info: CustomerContactInfo) => {
    setCustomerContactInfoState(info);
    localStorage.setItem('piEnergyContactInfo', JSON.stringify(info));
    hasChangesRef.current = true;
  };
  
  // Save bills immediately to database
  const setBills = useCallback((newBills: AustralianBillData[]) => {
    setBillsState(newBills);
    localStorage.setItem('piEnergyBills', JSON.stringify(newBills));
    hasChangesRef.current = true;
    
    // Get session ID from ref (synchronous, avoids stale closure)
    const sessionId = currentSessionIdRef.current;
    
    // Trigger immediate save when bills are added
    if (sessionId && newBills.length > 0) {
      // Extract customer info from the latest bill if available
      const sortedBills = [...newBills].sort((a, b) => {
        const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
        const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });
      const latestBill = sortedBills[0];
      
      // Use bill customer name if contact info name is not set
      const customerName = customerContactInfoRef.current.name || latestBill.customerName || undefined;
      
      saveFullSession(sessionId, {
        qualifiers: qualifiersRef.current,
        isEligible: isEligibleRef.current,
        bills: newBills,
        yearlyAnalysis: yearlyAnalysisRef.current || undefined,
        customerProfile: customerProfileRef.current || undefined,
        customerName: customerName,
        customerEmail: customerContactInfoRef.current.email || undefined,
        customerPhone: customerContactInfoRef.current.phone || undefined,
        status: isEligibleRef.current ? 'eligible' : 'in_progress',
      }).then(result => {
        if (result.success && result.session) {
          setCurrentSession(result.session);
          hasChangesRef.current = false;
          console.log('Bills saved successfully to session:', sessionId);
        } else {
          console.error('Failed to save bills:', result.error);
        }
      });
    } else if (!sessionId) {
      console.warn('No session ID available when saving bills. Bills saved to localStorage only.');
    }
  }, []);
  
  const setYearlyAnalysis = useCallback((analysis: YearlyAnalysis | null) => {
    setYearlyAnalysisState(analysis);
    hasChangesRef.current = true;
    
    const sessionId = currentSessionIdRef.current;
    
    // Trigger immediate save when analysis is updated
    if (sessionId && analysis) {
      saveFullSession(sessionId, {
        qualifiers: qualifiersRef.current,
        isEligible: isEligibleRef.current,
        bills: billsRef.current,
        yearlyAnalysis: analysis,
        customerProfile: customerProfileRef.current || undefined,
        customerName: customerContactInfoRef.current.name || undefined,
        customerEmail: customerContactInfoRef.current.email || undefined,
        customerPhone: customerContactInfoRef.current.phone || undefined,
        status: isEligibleRef.current ? 'eligible' : 'in_progress',
      }).then(result => {
        if (result.success && result.session) {
          setCurrentSession(result.session);
          hasChangesRef.current = false;
        }
      });
    }
  }, []);
  
  const setCustomerProfile = useCallback((profile: CustomerProfile | null) => {
    setCustomerProfileState(profile);
    hasChangesRef.current = true;
    
    const sessionId = currentSessionIdRef.current;
    
    // Trigger immediate save when profile is updated
    if (sessionId && profile) {
      saveFullSession(sessionId, {
        qualifiers: qualifiersRef.current,
        isEligible: isEligibleRef.current,
        bills: billsRef.current,
        yearlyAnalysis: yearlyAnalysisRef.current || undefined,
        customerProfile: profile,
        customerName: customerContactInfoRef.current.name || undefined,
        customerEmail: customerContactInfoRef.current.email || undefined,
        customerPhone: customerContactInfoRef.current.phone || undefined,
        status: isEligibleRef.current ? 'eligible' : 'in_progress',
      }).then(result => {
        if (result.success && result.session) {
          setCurrentSession(result.session);
          hasChangesRef.current = false;
        }
      });
    }
  }, []);


  const resetEligibility = () => {
    setIsEligibleState(false);
    setQualifiersState(defaultQualifiers);
    setCustomerContactInfoState(defaultContactInfo);
    setBillsState([]);
    setYearlyAnalysisState(null);
    setCustomerProfileState(null);
    setCurrentSession(null);
    setSessionCode(null);
    currentSessionIdRef.current = null;
    localStorage.removeItem('piEnergyEligible');
    localStorage.removeItem('customerQualifiers');
    localStorage.removeItem('piEnergyContactInfo');
    localStorage.removeItem('piEnergyBills');
    localStorage.removeItem('piEnergySessionCode');
  };

  // Start a new session
  const startNewSession = async (contactInfo?: CustomerContactInfo): Promise<string | null> => {
    setIsSessionLoading(true);
    setSessionError(null);
    
    const result = await createSession(qualifiers);
    
    setIsSessionLoading(false);
    
    if (result.success && result.session && result.sessionCode) {
      // Update ref immediately (synchronous)
      currentSessionIdRef.current = result.session.id;
      
      // Update state (asynchronous)
      setCurrentSession(result.session);
      setSessionCode(result.sessionCode);
      localStorage.setItem('piEnergySessionCode', result.sessionCode);
      
      // If contact info provided, save it immediately
      if (contactInfo && (contactInfo.name || contactInfo.email || contactInfo.phone)) {
        const saveResult = await saveFullSession(result.session.id, {
          qualifiers,
          isEligible,
          bills,
          yearlyAnalysis: yearlyAnalysis || undefined,
          customerProfile: customerProfile || undefined,
          customerName: contactInfo.name || undefined,
          customerEmail: contactInfo.email || undefined,
          customerPhone: contactInfo.phone || undefined,
          status: isEligible ? 'eligible' : 'in_progress',
        });
        
        if (saveResult.success && saveResult.session) {
          setCurrentSession(saveResult.session);
        }
      }
      
      return result.sessionCode;
    } else {
      setSessionError(result.error || 'Failed to create session');
      return null;
    }
  };

  // Load session by code
  const loadSessionByCode = async (code: string): Promise<boolean> => {
    setIsSessionLoading(true);
    setSessionError(null);
    
    const result = await getSessionByCode(code);
    
    setIsSessionLoading(false);
    
    if (result.success && result.session) {
      // Update ref immediately
      currentSessionIdRef.current = result.session.id;
      
      setCurrentSession(result.session);
      setSessionCode(result.session.sessionCode);
      localStorage.setItem('piEnergySessionCode', result.session.sessionCode);
      
      // Restore all state from session
      if (result.session.qualifiers) {
        setQualifiersState(result.session.qualifiers);
        localStorage.setItem('customerQualifiers', JSON.stringify(result.session.qualifiers));
      }
      if (result.session.isEligible !== null) {
        setIsEligibleState(result.session.isEligible);
        localStorage.setItem('piEnergyEligible', result.session.isEligible ? 'true' : 'false');
      }
      if (result.session.bills && result.session.bills.length > 0) {
        setBillsState(result.session.bills);
        localStorage.setItem('piEnergyBills', JSON.stringify(result.session.bills));
      }
      if (result.session.yearlyAnalysis) {
        setYearlyAnalysisState(result.session.yearlyAnalysis);
      }
      if (result.session.customerProfile) {
        setCustomerProfileState(result.session.customerProfile);
      }
      // Restore customer contact info
      if (result.session.customerName || result.session.customerEmail || result.session.customerPhone) {
        const contactInfo = {
          name: result.session.customerName || '',
          email: result.session.customerEmail || '',
          phone: result.session.customerPhone || '',
        };
        setCustomerContactInfoState(contactInfo);
        localStorage.setItem('piEnergyContactInfo', JSON.stringify(contactInfo));
      }
      
      return true;
    } else {
      setSessionError(result.error || 'Session not found');
      return false;
    }
  };

  // Manual save session - now accepts optional contact info to save immediately
  const saveSession = async (contactInfoToSave?: CustomerContactInfo): Promise<boolean> => {
    const infoToSave = contactInfoToSave || customerContactInfo;
    
    // Create session if doesn't exist
    if (!currentSessionIdRef.current) {
      const code = await startNewSession(infoToSave);
      return !!code;
    }
    
    // Save to existing session immediately
    const result = await saveFullSession(currentSessionIdRef.current, {
      qualifiers,
      isEligible,
      bills,
      yearlyAnalysis: yearlyAnalysis || undefined,
      customerProfile: customerProfile || undefined,
      customerName: infoToSave.name || undefined,
      customerEmail: infoToSave.email || undefined,
      customerPhone: infoToSave.phone || undefined,
      status: isEligible ? 'eligible' : 'in_progress',
    });
    
    if (result.success && result.session) {
      setCurrentSession(result.session);
      hasChangesRef.current = false;
      return true;
    }
    
    return false;
  };


  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        qualifiers,
        setQualifiers,
        isEligible,
        setIsEligible,
        resetEligibility,
        customerContactInfo,
        setCustomerContactInfo,
        currentSession,
        sessionCode,
        isSessionLoading,
        sessionError,
        startNewSession,
        loadSessionByCode,
        saveSession,
        bills,
        setBills,
        yearlyAnalysis,
        setYearlyAnalysis,
        customerProfile,
        setCustomerProfile,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
