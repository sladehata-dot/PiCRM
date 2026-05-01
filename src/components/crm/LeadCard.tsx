import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, Mail, MapPin, FileText, DollarSign, Clock, User, Activity, 
  AlertTriangle, UserCircle, CheckCircle, Loader2, Upload, ArrowRight,
  TrendingUp, Zap
} from 'lucide-react';
import { SessionSummary, SessionStatus } from '@/lib/sessionService';

interface LeadCardProps {
  lead: SessionSummary;
  onClick: () => void;
}

const statusConfig: Record<SessionStatus, { label: string; color: string; bg: string }> = {
  in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  eligible: { label: 'Eligible', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  not_eligible: { label: 'Not Eligible', color: 'text-red-400', bg: 'bg-red-500/20' },
  completed: { label: 'Completed', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

// Workflow stage display - now includes pending states
const workflowStageLabels: Record<string, { label: string; color: string }> = {
  bill_analysis: { label: 'Analysis', color: 'text-slate-400' },
  bill_analysis_pending: { label: 'Awaiting Bill', color: 'text-orange-400' },
  proposal_sent: { label: 'Proposal Sent', color: 'text-purple-400' },
  proposal_accepted: { label: 'Accepted', color: 'text-purple-400' },
  site_inspection_scheduled: { label: 'Inspection Scheduled', color: 'text-amber-400' },
  site_inspection_completed: { label: 'Inspected', color: 'text-amber-400' },
  infrastructure_review: { label: 'Review', color: 'text-orange-400' },
  installation_scheduled: { label: 'Install Scheduled', color: 'text-cyan-400' },
  installation_in_progress: { label: 'Installing', color: 'text-cyan-400' },
  installation_completed: { label: 'Installed', color: 'text-emerald-400' },
  maintenance: { label: 'Active', color: 'text-emerald-400' },
};

// Bill analysis status types
type BillAnalysisStatus = 'no_bills' | 'bills_pending_analysis' | 'analysis_complete';

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick }) => {
  const navigate = useNavigate();
  const status = statusConfig[lead.status] || statusConfig.in_progress;
  const workflowStage = lead.workflowStage || 'bill_analysis';

  // Determine bill analysis status
  const getBillAnalysisStatus = (): BillAnalysisStatus => {
    if (lead.billCount === 0) return 'no_bills';
    if (lead.totalSavings && lead.totalSavings > 0) return 'analysis_complete';
    return 'bills_pending_analysis';
  };

  const billAnalysisStatus = getBillAnalysisStatus();
  
  // Determine if bill analysis is pending (no bills captured yet)
  const isBillAnalysisPending = workflowStage === 'bill_analysis' && lead.billCount === 0;
  const displayStage = isBillAnalysisPending ? 'bill_analysis_pending' : workflowStage;
  const stageInfo = workflowStageLabels[displayStage] || workflowStageLabels.bill_analysis;
  
  // Check if lead has contact details
  const hasNoContactDetails = !lead.customerName && !lead.customerEmail && !lead.customerPhone;
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Handle quick action button click
  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/?session=${lead.sessionCode}`);
  };

  // Render bill analysis status indicator
  const renderBillAnalysisIndicator = () => {
    switch (billAnalysisStatus) {
      case 'no_bills':
        return (
          <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-orange-400">No Bills Uploaded</div>
                <div className="text-[10px] text-slate-500">Upload bills to calculate savings</div>
              </div>
            </div>
            <button
              onClick={handleQuickAction}
              className="px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-md flex items-center gap-1 transition-colors"
            >
              <Upload className="w-3 h-3" />
              Upload
            </button>
          </div>
        );
      
      case 'bills_pending_analysis':
        return (
          <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              </div>
              <div>
                <div className="text-xs font-medium text-amber-400">Analysis Pending</div>
                <div className="text-[10px] text-slate-500">{lead.billCount} bill{lead.billCount !== 1 ? 's' : ''} uploaded</div>
              </div>
            </div>
            <button
              onClick={handleQuickAction}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-md flex items-center gap-1 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Analyze
            </button>
          </div>
        );
      
      case 'analysis_complete':
        return (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-emerald-400">Analysis Complete</div>
                <div className="text-[10px] text-slate-400">{lead.billCount} bill{lead.billCount !== 1 ? 's' : ''} analyzed</div>
              </div>
            </div>
            {lead.totalSavings && (
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold">{formatCurrency(lead.totalSavings)}/yr</span>
              </div>
            )}
          </div>
        );
    }
  };

  // Progress bar for bill analysis
  const renderProgressBar = () => {
    let progress = 0;
    let color = 'bg-slate-600';
    
    if (billAnalysisStatus === 'no_bills') {
      progress = 0;
      color = 'bg-slate-600';
    } else if (billAnalysisStatus === 'bills_pending_analysis') {
      progress = 50;
      color = 'bg-amber-500';
    } else {
      progress = 100;
      color = 'bg-emerald-500';
    }

    return (
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>Bill Analysis Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${color} rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div 
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-cyan-500/50 hover:bg-slate-800/80 cursor-pointer transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono text-slate-500">{lead.sessionCode}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
          <h3 className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
            {lead.customerName || 'Unnamed Lead'}
          </h3>
        </div>
      </div>

      {/* Bill Analysis Status Indicator */}
      {renderBillAnalysisIndicator()}

      {/* Progress Bar */}
      {renderProgressBar()}

      {/* Workflow Stage Indicator - Always show for bill_analysis_pending */}
      {(isBillAnalysisPending || workflowStage !== 'bill_analysis') && (
        <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ${
          isBillAnalysisPending 
            ? 'bg-orange-500/20 border border-orange-500/30' 
            : 'bg-slate-700/50'
        }`}>
          {isBillAnalysisPending ? (
            <AlertTriangle className={`w-3.5 h-3.5 ${stageInfo.color}`} />
          ) : (
            <Activity className={`w-3.5 h-3.5 ${stageInfo.color}`} />
          )}
          <span className={`text-xs font-medium ${stageInfo.color}`}>
            {stageInfo.label}
          </span>
          {isBillAnalysisPending && (
            <span className="text-xs text-orange-400/70 ml-auto">Action required</span>
          )}
        </div>
      )}

      {/* Missing Contact Details Warning */}
      {hasNoContactDetails && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <UserCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-amber-400">No contact details captured</span>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-1.5 mb-3">
        {lead.customerEmail && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{lead.customerEmail}</span>
          </div>
        )}
        {lead.customerPhone && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Phone className="w-3.5 h-3.5" />
            <span>{lead.customerPhone}</span>
          </div>
        )}
        {/* Show service address from bill if available, otherwise postcode */}
        {lead.serviceAddress ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{lead.serviceAddress}</span>
          </div>
        ) : lead.postcode && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <MapPin className="w-3.5 h-3.5" />
            <span>Postcode: {lead.postcode}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
        <div className="flex items-center gap-3">
          {lead.isEligible !== null && (
            <div className={`flex items-center gap-1 text-xs ${lead.isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
              <User className="w-3.5 h-3.5" />
              <span>{lead.isEligible ? 'Eligible' : 'Not Eligible'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(lead.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;
