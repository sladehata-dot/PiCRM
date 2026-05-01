import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Phone, Mail, MapPin, FileText, DollarSign, Clock, User,
  Calendar, Save, Trash2, Archive, CheckCircle, AlertCircle,
  ChevronDown, ChevronUp, Edit2, MessageSquare, Activity, Home, Building,
  ExternalLink, Upload, AlertTriangle, Loader2, Zap, TrendingUp, BarChart3,
  RefreshCw, BatteryCharging, Sun
} from 'lucide-react';
import { fetchMarketOffers, matchMarketOffers, type MatchResult, type EnergyProfile } from '@/lib/marketMatcher';
import { 
  CustomerSession, 
  SessionStatus,
  ContactAddress,

  getSessionById, 
  updateSessionCustomerInfo,
  updateSessionContactAddress,
  updateSessionSalesNotes,
  updateSessionStatus,
  deleteSession,
  archiveSession
} from '@/lib/sessionService';
import { getFullWorkflowData } from '@/lib/workflowService';
import { WorkflowStage, SiteInspection, Installation, MaintenanceAlert } from '@/types/WorkflowTypes';
import WorkflowTimeline from '@/components/workflow/WorkflowTimeline';
import ProposalSection from '@/components/workflow/ProposalSection';
import SiteInspectionSection from '@/components/workflow/SiteInspectionSection';
import InstallationSection from '@/components/workflow/InstallationSection';
import MaintenanceSection from '@/components/workflow/MaintenanceSection';

interface LeadDetailModalProps {
  sessionId: string;
  onClose: () => void;
  onUpdate: () => void;
}

const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'];

const statusConfig: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  eligible: { label: 'Eligible', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  not_eligible: { label: 'Not Eligible', color: 'text-red-400', bg: 'bg-red-500/20' },
  completed: { label: 'Completed', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

// Bill analysis status types
type BillAnalysisStatus = 'no_bills' | 'bills_pending_analysis' | 'analysis_complete';

// Helper function to parse service address into components
function parseServiceAddress(address: string): ContactAddress {
  // Try to parse Australian address format: "123 Street Name, Suburb STATE 1234"
  const parts = address.split(',').map(p => p.trim());
  
  if (parts.length >= 2) {
    const streetAddress = parts[0];
    const lastPart = parts[parts.length - 1];
    
    // Try to extract suburb, state, postcode from last part
    const statePostcodeMatch = lastPart.match(/^(.+?)\s+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s+(\d{4})$/i);
    
    if (statePostcodeMatch) {
      return {
        streetAddress,
        suburb: statePostcodeMatch[1].trim(),
        state: statePostcodeMatch[2].toUpperCase(),
        postcode: statePostcodeMatch[3],
      };
    }
    
    // Try just suburb and postcode
    const postcodeMatch = lastPart.match(/^(.+?)\s+(\d{4})$/);
    if (postcodeMatch) {
      return {
        streetAddress,
        suburb: postcodeMatch[1].trim(),
        state: '',
        postcode: postcodeMatch[2],
      };
    }
  }
  
  // Fallback: just use the whole address as street
  return {
    streetAddress: address,
    suburb: '',
    state: '',
    postcode: '',
  };
}

const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ sessionId, onClose, onUpdate }) => {
  const navigate = useNavigate();

  const [session, setSession] = useState<CustomerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Workflow data
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('bill_analysis');
  const [inspection, setInspection] = useState<SiteInspection | null>(null);
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  
  // Editable fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [salesNotes, setSalesNotes] = useState('');
  const [assignedRep, setAssignedRep] = useState('');
  
  // Contact address fields
  const [contactSameAsProperty, setContactSameAsProperty] = useState(true);
  const [contactStreetAddress, setContactStreetAddress] = useState('');
  const [contactSuburb, setContactSuburb] = useState('');
  const [contactState, setContactState] = useState('');
  const [contactPostcode, setContactPostcode] = useState('');
  
  // UI state
  const [activeTab, setActiveTab] = useState<'details' | 'workflow' | 'market'>('details');
  const [showQualifiers, setShowQualifiers] = useState(false);
  const [showBills, setShowBills] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);

  // Market intelligence
  const [marketResult, setMarketResult] = useState<MatchResult | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // Get bill analysis status
  const getBillAnalysisStatus = (): BillAnalysisStatus => {
    if (!session) return 'no_bills';
    const billCount = session.bills?.length || 0;
    if (billCount === 0) return 'no_bills';
    if (session.yearlyAnalysis?.totalSavings && session.yearlyAnalysis.totalSavings > 0) return 'analysis_complete';
    return 'bills_pending_analysis';
  };


  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    setLoading(true);
    setError(null);
    
    const [sessionResult, workflowData] = await Promise.all([
      getSessionById(sessionId),
      getFullWorkflowData(sessionId),
    ]);
    
    if (sessionResult.success && sessionResult.session) {
      setSession(sessionResult.session);
      setCustomerName(sessionResult.session.customerName || '');
      setCustomerEmail(sessionResult.session.customerEmail || '');
      setCustomerPhone(sessionResult.session.customerPhone || '');
      setSalesNotes(sessionResult.session.salesNotes || '');
      setAssignedRep(sessionResult.session.assignedSalesRep || '');
      
      // Set contact address fields
      setContactSameAsProperty(sessionResult.session.contactSameAsProperty);
      if (sessionResult.session.contactAddress) {
        setContactStreetAddress(sessionResult.session.contactAddress.streetAddress);
        setContactSuburb(sessionResult.session.contactAddress.suburb);
        setContactState(sessionResult.session.contactAddress.state);
        setContactPostcode(sessionResult.session.contactAddress.postcode);
      }
    } else {
      setError(sessionResult.error || 'Failed to load session');
    }
    
    setWorkflowStage(workflowData.stage);
    setInspection(workflowData.inspection);
    setInstallation(workflowData.installation);
    setAlerts(workflowData.alerts);
    
    setLoading(false);
  };

  const handleSaveCustomerInfo = async () => {
    if (!session) return;
    
    setSaving(true);
    const result = await updateSessionCustomerInfo(session.id, {
      customerName,
      customerEmail,
      customerPhone
    });
    
    if (result.success) {
      setSession(result.session!);
      setIsEditing(false);
      onUpdate();
    } else {
      setError(result.error || 'Failed to save');
    }
    setSaving(false);
  };

  const handleSaveContactAddress = async () => {
    if (!session) return;
    
    setSaving(true);
    
    const contactAddress: ContactAddress | null = contactSameAsProperty ? null : {
      streetAddress: contactStreetAddress,
      suburb: contactSuburb,
      state: contactState,
      postcode: contactPostcode,
    };
    
    const result = await updateSessionContactAddress(session.id, contactAddress, contactSameAsProperty);
    
    if (result.success) {
      setSession(result.session!);
      setIsEditingAddress(false);
      onUpdate();
    } else {
      setError(result.error || 'Failed to save address');
    }
    setSaving(false);
  };

  const handleSameAsPropertyChange = (checked: boolean) => {
    setContactSameAsProperty(checked);
    
    if (checked) {
      // Clear contact address fields when same as property
      setContactStreetAddress('');
      setContactSuburb('');
      setContactState('');
      setContactPostcode('');
    } else {
      // Auto-fill from property address (bill data) if available
      const billServiceAddress = session?.customerProfile?.serviceAddress || 
        (session?.bills && session.bills.length > 0 ? session.bills[0].serviceAddress : null);
      
      if (billServiceAddress) {
        const parsed = parseServiceAddress(billServiceAddress);
        setContactStreetAddress(parsed.streetAddress);
        setContactSuburb(parsed.suburb);
        setContactState(parsed.state);
        setContactPostcode(parsed.postcode);
      }
    }
  };

  const handleSaveNotes = async () => {
    if (!session) return;
    
    setSaving(true);
    const result = await updateSessionSalesNotes(session.id, salesNotes, assignedRep);
    
    if (result.success) {
      setSession(result.session!);
      onUpdate();
    } else {
      setError(result.error || 'Failed to save notes');
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: SessionStatus) => {
    if (!session) return;
    
    setSaving(true);
    const result = await updateSessionStatus(session.id, newStatus);
    
    if (result.success) {
      setSession(result.session!);
      onUpdate();
    } else {
      setError(result.error || 'Failed to update status');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!session) return;
    if (!window.confirm('Are you sure you want to delete this lead? This cannot be undone.')) return;
    
    setSaving(true);
    const result = await deleteSession(session.id);
    
    if (result.success) {
      onUpdate();
      onClose();
    } else {
      setError(result.error || 'Failed to delete');
    }
    setSaving(false);
  };

  const handleArchive = async () => {
    if (!session) return;
    
    setSaving(true);
    const result = await archiveSession(session.id);
    
    if (result.success) {
      setSession(result.session!);
      onUpdate();
    } else {
      setError(result.error || 'Failed to archive');
    }
    setSaving(false);
  };

  const handleWorkflowUpdate = () => {
    loadSession();
    onUpdate();
  };

  const runMarketMatch = async (s: typeof session) => {
    if (!s) return;
    setMarketLoading(true);
    setMarketError(null);

    // Derive state from postcode
    const postcode = parseInt(s.qualifiers?.postcode || '0', 10);
    let state = 'QLD';
    if (postcode >= 2000 && postcode <= 2999) state = 'NSW';
    else if (postcode >= 3000 && postcode <= 3999) state = 'VIC';

    // Derive energy profile from bills
    const bills = s.bills || [];
    const totalDays = bills.reduce((sum: number, b: any) => sum + (b.billingDays || 30), 0);
    const totalKwh = bills.reduce((sum: number, b: any) => sum + (b.gridImportKwh || 0), 0);
    const avg_daily_kwh = totalDays > 0 ? totalKwh / totalDays : 0;
    const latestBill = bills[0] as any;
    const tariff_type = latestBill?.tariffType === 'TOU' ? 'TOU' : 'flat';

    const solar_capacity_kw = s.customerProfile?.solarSystemSize ||
      (latestBill?.solarSystemSize) || 0;
    const hasBattery = s.qualifiers?.hasHomeBattery === true;
    const hasSolar = s.qualifiers?.hasSolar === true;
    const export_eligible = hasSolar && (latestBill?.solarExportKwh || 0) > 0;

    const profile: EnergyProfile = {
      avg_daily_kwh,
      tariff_type,
      solar_capacity_kw,
      battery_capacity_kwh: hasBattery ? 10 : 0,
      current_soc_pct: 100,
      export_eligible,
      state,
    };

    if (avg_daily_kwh === 0) {
      setMarketError('No bill data — upload and analyse bills first.');
      setMarketLoading(false);
      return;
    }

    const offers = await fetchMarketOffers(state);
    if (offers.length === 0) {
      setMarketError(`No market offers synced for ${state} yet. Run the market sync via pi-eia-next.`);
      setMarketLoading(false);
      return;
    }

    setMarketResult(matchMarketOffers(profile, offers));
    setMarketLoading(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format contact address for display
  const formatContactAddress = (addr: ContactAddress): string => {
    const parts = [addr.streetAddress];
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.state) parts.push(addr.state);
    if (addr.postcode) parts.push(addr.postcode);
    return parts.join(', ');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-4">Loading lead details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-center mb-4">{error || 'Lead not found'}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const status = statusConfig[session.status];
  
  // Get addresses from different sources
  const propertyPostcode = session.qualifiers?.postcode;
  const billServiceAddress = session.customerProfile?.serviceAddress || 
    (session.bills && session.bills.length > 0 ? session.bills[0].serviceAddress : null);
  const billCustomerName = session.bills && session.bills.length > 0 ? session.bills[0].customerName : null;
  
  // Determine customer address (from bill or postcode)
  const customerAddress = billServiceAddress || (propertyPostcode ? `Postcode: ${propertyPostcode}` : null);
  
  // Get contact address display
  const displayContactAddress = session.contactSameAsProperty 
    ? billServiceAddress 
    : (session.contactAddress ? formatContactAddress(session.contactAddress) : null);

  // Get bill analysis status for display
  const billAnalysisStatus = getBillAnalysisStatus();
  const billCount = session.bills?.length || 0;

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (billAnalysisStatus === 'no_bills') return 0;
    if (billAnalysisStatus === 'bills_pending_analysis') return 50;
    return 100;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 overflow-y-auto py-4 md:py-8">
      <div className="bg-slate-800 rounded-xl w-full max-w-5xl mx-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-700">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-slate-400">{session.sessionCode}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">
              {session.customerName || billCustomerName || 'Unnamed Lead'}
            </h2>
            {/* Show bill customer name if different from session customer name */}
            {billCustomerName && session.customerName && billCustomerName !== session.customerName && (
              <p className="text-xs text-slate-500">Bill name: {billCustomerName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Bill Analysis Status Banner */}
        <div className="px-4 md:px-6 py-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-4 flex-1">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                billAnalysisStatus === 'no_bills' 
                  ? 'bg-orange-500/20' 
                  : billAnalysisStatus === 'bills_pending_analysis'
                    ? 'bg-amber-500/20'
                    : 'bg-emerald-500/20'
              }`}>
                {billAnalysisStatus === 'no_bills' && (
                  <FileText className="w-6 h-6 text-orange-400" />
                )}
                {billAnalysisStatus === 'bills_pending_analysis' && (
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                )}
                {billAnalysisStatus === 'analysis_complete' && (
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                )}
              </div>

              {/* Status Text & Progress */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-medium ${
                    billAnalysisStatus === 'no_bills' 
                      ? 'text-orange-400' 
                      : billAnalysisStatus === 'bills_pending_analysis'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }`}>
                    {billAnalysisStatus === 'no_bills' && 'No Bills Uploaded'}
                    {billAnalysisStatus === 'bills_pending_analysis' && 'Analysis Pending'}
                    {billAnalysisStatus === 'analysis_complete' && 'Analysis Complete'}
                  </span>
                  {billAnalysisStatus === 'analysis_complete' && session.yearlyAnalysis && (
                    <span className="flex items-center gap-1 text-emerald-400 text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      {new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(session.yearlyAnalysis.totalSavings)}/yr savings
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  {billAnalysisStatus === 'no_bills' && 'Upload energy bills to calculate potential savings'}
                  {billAnalysisStatus === 'bills_pending_analysis' && `${billCount} bill${billCount !== 1 ? 's' : ''} uploaded - complete analysis to see savings`}
                  {billAnalysisStatus === 'analysis_complete' && `${billCount} bill${billCount !== 1 ? 's' : ''} analyzed successfully`}
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        billAnalysisStatus === 'no_bills' 
                          ? 'bg-slate-600' 
                          : billAnalysisStatus === 'bills_pending_analysis'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`}
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 w-8">{getProgressPercentage()}%</span>
                </div>
              </div>
            </div>

            {/* Quick Action Button */}
            {billAnalysisStatus !== 'analysis_complete' && (
              <button
                onClick={() => navigate(`/?session=${session.sessionCode}`)}
                className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                  billAnalysisStatus === 'no_bills'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                {billAnalysisStatus === 'no_bills' ? (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload Bills
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Complete Analysis
                  </>
                )}
              </button>
            )}

            {billAnalysisStatus === 'analysis_complete' && (
              <button
                onClick={() => navigate(`/?session=${session.sessionCode}`)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4" />
                View Analysis
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Lead Details
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'workflow' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            Workflow
            {alerts.filter(a => a.status === 'open').length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {alerts.filter(a => a.status === 'open').length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('market');
              if (!marketResult && session) runMarketMatch(session);
            }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'market'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            Market Intel
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-4 md:mx-6 mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}


        {/* Details Tab */}
        {activeTab === 'details' && (
          <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Information */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Contact Information
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
                
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Name</label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Email</label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                        placeholder="customer@email.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Phone</label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                        placeholder="0400 000 000"
                      />
                    </div>
                    <button
                      onClick={handleSaveCustomerInfo}
                      disabled={saving}
                      className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <User className="w-4 h-4 text-slate-500" />
                      <span>{session.customerName || billCustomerName || 'No name provided'}</span>
                      {billCustomerName && !session.customerName && (
                        <span className="text-xs text-cyan-400">(from bill)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span>{session.customerEmail || 'No email provided'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span>{session.customerPhone || 'No phone provided'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Address Section */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-medium flex items-center gap-2 mb-4">
                  <Home className="w-4 h-4 text-cyan-400" />
                  Property / Service Address
                </h3>
                {billServiceAddress && (
                  <div className="flex items-start gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                    <div>
                      <span>{billServiceAddress}</span>
                      <span className="text-xs text-cyan-400 ml-2">(from bill)</span>
                    </div>
                  </div>
                )}
                {propertyPostcode && !billServiceAddress && (
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>Postcode: {propertyPostcode}</span>
                    <span className="text-xs text-amber-400">(from eligibility)</span>
                  </div>
                )}
                {!billServiceAddress && !propertyPostcode && (
                  <p className="text-slate-500 text-sm">No property address information</p>
                )}
              </div>

              {/* Customer Contact Address Section */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-medium flex items-center gap-2">
                    <Building className="w-4 h-4 text-cyan-400" />
                    Customer Contact Address
                  </h3>
                  <button
                    onClick={() => setIsEditingAddress(!isEditingAddress)}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    {isEditingAddress ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {isEditingAddress ? (
                  <div className="space-y-4">
                    {/* Same as Property Checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={contactSameAsProperty}
                          onChange={(e) => handleSameAsPropertyChange(e.target.checked)}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          contactSameAsProperty 
                            ? 'bg-cyan-500 border-cyan-500' 
                            : 'border-slate-500 group-hover:border-slate-400'
                        }`}>
                          {contactSameAsProperty && (
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>
                      <span className="text-slate-300 text-sm">Same as property address</span>
                    </label>

                    {/* Contact Address Fields - Only show when not same as property */}
                    {!contactSameAsProperty && (
                      <div className="space-y-3 pt-2 border-t border-slate-600">
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">Street Address</label>
                          <input
                            type="text"
                            value={contactStreetAddress}
                            onChange={(e) => setContactStreetAddress(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                            placeholder="123 Example Street"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">Suburb</label>
                            <input
                              type="text"
                              value={contactSuburb}
                              onChange={(e) => setContactSuburb(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                              placeholder="Suburb"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 block mb-1">State</label>
                            <select
                              value={contactState}
                              onChange={(e) => setContactState(e.target.value)}
                              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                            >
                              <option value="">Select state</option>
                              {AUSTRALIAN_STATES.map(state => (
                                <option key={state} value={state}>{state}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="w-1/2">
                          <label className="text-xs text-slate-400 block mb-1">Postcode</label>
                          <input
                            type="text"
                            value={contactPostcode}
                            onChange={(e) => setContactPostcode(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                            placeholder="0000"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleSaveContactAddress}
                      disabled={saving}
                      className="w-full px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Saving...' : 'Save Address'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {session.contactSameAsProperty ? (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                        <div>
                          <span className="text-slate-300 text-sm">Same as property address</span>
                          {billServiceAddress && (
                            <p className="text-slate-400 text-sm mt-1">{billServiceAddress}</p>
                          )}
                        </div>
                      </div>
                    ) : session.contactAddress ? (
                      <div className="flex items-start gap-2 text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p>{session.contactAddress.streetAddress}</p>
                          <p className="text-sm text-slate-400">
                            {[session.contactAddress.suburb, session.contactAddress.state, session.contactAddress.postcode]
                              .filter(Boolean)
                              .join(' ')}
                          </p>
                          {billServiceAddress && (
                            <p className="text-xs text-amber-400 mt-1">
                              Different from property: {billServiceAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No contact address set</p>
                    )}
                  </div>
                )}
              </div>

              {/* Qualifiers */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <button
                  onClick={() => setShowQualifiers(!showQualifiers)}
                  className="w-full flex items-center justify-between text-white font-medium"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    Eligibility Qualifiers
                  </span>
                  {showQualifiers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showQualifiers && session.qualifiers && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {Object.entries(session.qualifiers).map(([key, value]) => (
                      value !== null && (
                        <div key={key} className="bg-slate-800/50 rounded-lg p-2">
                          <div className="text-xs text-slate-400 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm text-white">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Bills Summary */}
              {session.bills && session.bills.length > 0 && (
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <button
                    onClick={() => setShowBills(!showBills)}
                    className="w-full flex items-center justify-between text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      Bills ({session.bills.length})
                    </span>
                    {showBills ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  
                  {showBills && (
                    <div className="mt-4 space-y-2">
                      {session.bills.map((bill, index) => (
                        <div key={bill.id || index} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm text-white">
                              {bill.billingPeriodStart} - {bill.billingPeriodEnd}
                            </div>
                            <div className="text-xs text-slate-400">
                              {bill.retailer} • {bill.gridImportKwh} kWh
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatCurrency(bill.totalAmount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Savings Analysis */}
              {session.yearlyAnalysis && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="text-emerald-400 font-medium flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4" />
                    Savings Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Current Annual Cost</div>
                      <div className="text-lg text-white font-semibold">
                        {formatCurrency(session.yearlyAnalysis.totalCurrentCost ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Pi Energy Cost</div>
                      <div className="text-lg text-cyan-400 font-semibold">
                        {formatCurrency(session.yearlyAnalysis.totalPiCost ?? 0)}
                      </div>
                    </div>
                    <div className="col-span-2 pt-3 border-t border-emerald-500/20">
                      <div className="text-xs text-slate-400">Annual Savings</div>
                      <div className="text-2xl text-emerald-400 font-bold">
                        {formatCurrency(session.yearlyAnalysis.totalSavings)}
                        <span className="text-sm font-normal ml-2">
                          ({(session.yearlyAnalysis.savingsPercentage ?? 0).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Actions & Notes */}
            <div className="space-y-6">
              {/* Status Actions */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3">Update Status</h3>
                <div className="space-y-2">
                  {(['in_progress', 'eligible', 'not_eligible', 'completed'] as SessionStatus[]).map((s) => {
                    const config = statusConfig[s];
                    const isActive = session.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        disabled={saving || isActive}
                        className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-all ${
                          isActive 
                            ? `${config.bg} ${config.color} border border-current` 
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {config.label}
                        {isActive && <CheckCircle className="w-4 h-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sales Notes */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Sales Notes
                </h3>
                <textarea
                  value={salesNotes}
                  onChange={(e) => setSalesNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none resize-none"
                  rows={4}
                  placeholder="Add notes about this lead..."
                />
                <div className="mt-3">
                  <label className="text-xs text-slate-400 block mb-1">Assigned Rep</label>
                  <input
                    type="text"
                    value={assignedRep}
                    onChange={(e) => setAssignedRep(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    placeholder="Sales rep name"
                  />
                </div>
                <button
                  onClick={handleSaveNotes}
                  disabled={saving}
                  className="w-full mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Notes'}
                </button>
              </div>

              {/* Timestamps */}
              <div className="bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-white font-medium flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Activity
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Created</span>
                    <span className="text-white">{formatDate(session.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated</span>
                    <span className="text-white">{formatDate(session.updatedAt)}</span>
                  </div>
                  {session.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed</span>
                      <span className="text-emerald-400">{formatDate(session.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <h3 className="text-red-400 font-medium mb-3">Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleArchive}
                    disabled={saving || session.status === 'archived'}
                    className="w-full px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Archive className="w-4 h-4" />
                    Archive Lead
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Lead
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Tab */}
        {activeTab === 'workflow' && (
          <div className="p-4 md:p-6 space-y-6">
            {/* Workflow Timeline */}
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-white font-medium mb-4">Workflow Progress</h3>
              <WorkflowTimeline currentStage={workflowStage} compact />
            </div>

            {/* Workflow Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Proposal Section - Show after bill analysis */}
              {session.yearlyAnalysis && (
                <ProposalSection
                  sessionId={sessionId}
                  existingProposal={(session as any).proposal_data}
                  estimatedSavings={session.yearlyAnalysis.totalSavings}
                  onProposalSent={handleWorkflowUpdate}
                  onProposalAccepted={handleWorkflowUpdate}
                />
              )}

              {/* Site Inspection - Show after proposal accepted */}
              {(workflowStage === 'proposal_accepted' || 
                workflowStage === 'site_inspection_scheduled' || 
                workflowStage === 'site_inspection_completed' ||
                workflowStage === 'infrastructure_review' ||
                workflowStage === 'installation_scheduled' ||
                workflowStage === 'installation_in_progress' ||
                workflowStage === 'installation_completed' ||
                workflowStage === 'maintenance') && (
                <SiteInspectionSection
                  sessionId={sessionId}
                  customerAddress={customerAddress ?? undefined}
                  onInspectionScheduled={handleWorkflowUpdate}
                  onInspectionCompleted={handleWorkflowUpdate}
                />
              )}

              {/* Installation - Show after inspection completed */}
              {(workflowStage === 'site_inspection_completed' ||
                workflowStage === 'infrastructure_review' ||
                workflowStage === 'installation_scheduled' ||
                workflowStage === 'installation_in_progress' ||
                workflowStage === 'installation_completed' ||
                workflowStage === 'maintenance') && (
                <InstallationSection
                  sessionId={sessionId}
                  inspection={inspection}
                  onInstallationScheduled={handleWorkflowUpdate}
                  onInstallationCompleted={handleWorkflowUpdate}
                />
              )}
            </div>

            {/* Maintenance Section - Show after installation completed */}
            {workflowStage === 'maintenance' && (
              <MaintenanceSection
                sessionId={sessionId}
                installationId={installation?.id}
              />
            )}

            {/* No workflow started message - with action button */}
            {!session.yearlyAnalysis && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Bill Analysis Required</h3>
                  <p className="text-slate-400 mb-6 max-w-md mx-auto">
                    {session.bills && session.bills.length > 0 
                      ? `${session.bills.length} bill(s) uploaded but analysis not completed. Open the bill analyzer to complete the analysis.`
                      : 'No energy bills have been captured yet. Upload and analyze bills to calculate savings and continue the workflow.'}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => {
                        // Navigate to main app with session code to load this session
                        navigate(`/?session=${session.sessionCode}`);
                      }}
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Upload className="w-5 h-5" />
                      {session.bills && session.bills.length > 0 ? 'Complete Analysis' : 'Upload Bills'}
                    </button>
                    
                    <button
                      onClick={() => {
                        // Copy session code to clipboard
                        navigator.clipboard.writeText(session.sessionCode);
                        alert(`Session code ${session.sessionCode} copied to clipboard!`);
                      }}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      Copy Session Code
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-4">
                    Session Code: <span className="font-mono text-slate-400">{session.sessionCode}</span>
                  </p>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Market Intelligence Tab */}
        {activeTab === 'market' && (
          <div className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">Market Intelligence</h3>
                <p className="text-slate-400 text-sm">Pi vs live AER retail offers for this customer's state</p>
              </div>
              <button
                onClick={() => runMarketMatch(session)}
                disabled={marketLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${marketLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {marketLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Fetching market offers…</p>
                </div>
              </div>
            )}

            {marketError && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-sm">{marketError}</p>
              </div>
            )}

            {marketResult && !marketLoading && (
              <>
                {/* Recommendation Banner */}
                <div className={`rounded-xl p-4 border flex items-start gap-3 ${
                  marketResult.recommendation_type === 'pi_competitive'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : marketResult.recommendation_type === 'export_maximiser'
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : 'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    marketResult.recommendation_type === 'pi_competitive' ? 'bg-emerald-500/20' :
                    marketResult.recommendation_type === 'export_maximiser' ? 'bg-cyan-500/20' : 'bg-amber-500/20'
                  }`}>
                    {marketResult.recommendation_type === 'pi_competitive' && <CheckCircle className="w-5 h-5 text-emerald-400" />}
                    {marketResult.recommendation_type === 'export_maximiser' && <Sun className="w-5 h-5 text-cyan-400" />}
                    {marketResult.recommendation_type === 'switch' && <AlertCircle className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <p className={`font-semibold ${
                      marketResult.recommendation_type === 'pi_competitive' ? 'text-emerald-400' :
                      marketResult.recommendation_type === 'export_maximiser' ? 'text-cyan-400' : 'text-amber-400'
                    }`}>
                      {marketResult.recommendation}
                    </p>
                    <p className="text-slate-400 text-sm mt-0.5">
                      Based on {marketResult.avg_daily_kwh.toFixed(1)} kWh/day net consumption ({Math.round(marketResult.annual_kwh).toLocaleString()} kWh/yr)
                    </p>
                  </div>
                </div>

                {/* Pi vs Market Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                    <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wide mb-1">Pi Annual Cost</p>
                    <p className="text-2xl font-bold text-emerald-400">${Math.round(marketResult.pi_annual_cost).toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-1">{marketResult.pi_rate_cents}¢/kWh flat · no supply charge</p>
                  </div>
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                    <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Best Alternative</p>
                    {marketResult.top_3_offers[0] ? (
                      <>
                        <p className="text-2xl font-bold text-white">${Math.round(marketResult.top_3_offers[0].annual_cost).toLocaleString()}</p>
                        <p className="text-slate-400 text-xs mt-1">{marketResult.top_3_offers[0].retailer}</p>
                      </>
                    ) : <p className="text-slate-500 text-sm">No offers</p>}
                  </div>
                </div>

                {/* Top 3 Offers */}
                {marketResult.top_3_offers.length > 0 && (
                  <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700">
                      <h4 className="text-white font-medium text-sm">Top Retail Alternatives</h4>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {marketResult.top_3_offers.map((offer, i) => (
                        <div key={i} className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-white text-sm font-medium">{offer.retailer}</p>
                            <p className="text-slate-400 text-xs">{offer.plan_name} · {offer.plan_type}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white text-sm font-semibold">${Math.round(offer.annual_cost).toLocaleString()}/yr</p>
                            <p className={`text-xs ${offer.delta_vs_pi > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {offer.delta_vs_pi > 0 ? `Pi saves $${Math.round(offer.delta_vs_pi)}` : `$${Math.round(Math.abs(offer.delta_vs_pi))} cheaper`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* VPP Readiness */}
                <div className={`rounded-lg p-4 border flex items-center gap-3 ${
                  marketResult.vpp_ready ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-slate-700/30 border-slate-600'
                }`}>
                  <BatteryCharging className={`w-5 h-5 flex-shrink-0 ${marketResult.vpp_ready ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div>
                    <p className={`font-medium text-sm ${marketResult.vpp_ready ? 'text-cyan-400' : 'text-slate-400'}`}>
                      VPP Readiness
                    </p>
                    <p className="text-slate-400 text-xs">{marketResult.vpp_status}</p>
                  </div>
                </div>
              </>
            )}

            {!marketResult && !marketLoading && !marketError && (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Click Refresh to run market analysis</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetailModal;
