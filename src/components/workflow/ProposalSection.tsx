import React, { useState } from 'react';
import { FileText, Send, Check, DollarSign, Calendar, Clock, Edit2 } from 'lucide-react';
import { ProposalData } from '@/types/WorkflowTypes';
import { saveProposal, acceptProposal } from '@/lib/workflowService';

interface ProposalSectionProps {
  sessionId: string;
  existingProposal?: ProposalData | null;
  estimatedSavings?: number;
  onProposalSent?: () => void;
  onProposalAccepted?: () => void;
}

const ProposalSection: React.FC<ProposalSectionProps> = ({
  sessionId,
  existingProposal,
  estimatedSavings = 0,
  onProposalSent,
  onProposalAccepted,
}) => {
  const [isEditing, setIsEditing] = useState(!existingProposal);
  const [isSaving, setIsSaving] = useState(false);
  const [proposal, setProposal] = useState<Partial<ProposalData>>(existingProposal || {
    systemSizeKw: 6.6,
    batteryCapacityKwh: 10,
    estimatedCost: 12500,
    estimatedSavingsPerYear: estimatedSavings,
    paybackPeriodYears: estimatedSavings > 0 ? Math.round(12500 / estimatedSavings * 10) / 10 : 5,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const handleSendProposal = async () => {
    setIsSaving(true);
    const result = await saveProposal(sessionId, proposal as ProposalData);
    setIsSaving(false);
    
    if (result.success) {
      setIsEditing(false);
      onProposalSent?.();
    }
  };

  const handleAcceptProposal = async () => {
    setIsSaving(true);
    const result = await acceptProposal(sessionId);
    setIsSaving(false);
    
    if (result.success) {
      onProposalAccepted?.();
    }
  };

  const isAccepted = existingProposal?.termsAccepted;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Customer Proposal</h3>
            <p className="text-sm text-slate-400">
              {isAccepted 
                ? 'Proposal accepted by customer' 
                : existingProposal 
                ? 'Awaiting customer acceptance' 
                : 'Create and send proposal'}
            </p>
          </div>
        </div>
        {existingProposal && !isAccepted && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {isEditing ? (
          <>
            {/* System Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">System Size (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  value={proposal.systemSizeKw || ''}
                  onChange={(e) => setProposal({ ...proposal, systemSizeKw: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Battery (kWh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={proposal.batteryCapacityKwh || ''}
                  onChange={(e) => setProposal({ ...proposal, batteryCapacityKwh: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Costs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Total Cost ($)</label>
                <input
                  type="number"
                  value={proposal.estimatedCost || ''}
                  onChange={(e) => {
                    const cost = parseFloat(e.target.value);
                    const payback = proposal.estimatedSavingsPerYear && proposal.estimatedSavingsPerYear > 0
                      ? Math.round(cost / proposal.estimatedSavingsPerYear * 10) / 10
                      : 0;
                    setProposal({ ...proposal, estimatedCost: cost, paybackPeriodYears: payback });
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Est. Savings/Year ($)</label>
                <input
                  type="number"
                  value={proposal.estimatedSavingsPerYear || ''}
                  onChange={(e) => {
                    const savings = parseFloat(e.target.value);
                    const payback = savings > 0 && proposal.estimatedCost
                      ? Math.round(proposal.estimatedCost / savings * 10) / 10
                      : 0;
                    setProposal({ ...proposal, estimatedSavingsPerYear: savings, paybackPeriodYears: payback });
                  }}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payback & Validity */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Payback Period (years)</label>
                <input
                  type="number"
                  step="0.1"
                  value={proposal.paybackPeriodYears || ''}
                  onChange={(e) => setProposal({ ...proposal, paybackPeriodYears: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={proposal.validUntil || ''}
                  onChange={(e) => setProposal({ ...proposal, validUntil: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleSendProposal}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Proposal to Customer</span>
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Proposal Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">System Size</div>
                <div className="text-lg font-semibold text-white">{existingProposal?.systemSizeKw} kW</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Battery</div>
                <div className="text-lg font-semibold text-white">{existingProposal?.batteryCapacityKwh || 0} kWh</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Total Cost</div>
                <div className="text-lg font-semibold text-emerald-400">
                  ${existingProposal?.estimatedCost?.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-1">Payback</div>
                <div className="text-lg font-semibold text-cyan-400">{existingProposal?.paybackPeriodYears} yrs</div>
              </div>
            </div>

            {/* Savings Highlight */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-emerald-400" />
                <div>
                  <div className="text-sm text-emerald-400">Estimated Annual Savings</div>
                  <div className="text-2xl font-bold text-white">
                    ${existingProposal?.estimatedSavingsPerYear?.toLocaleString()}/year
                  </div>
                </div>
              </div>
            </div>

            {/* Validity */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Valid until: {existingProposal?.validUntil}</span>
            </div>

            {/* Accept Button or Status */}
            {isAccepted ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">
                  Proposal Accepted on {new Date(existingProposal.acceptedAt!).toLocaleDateString('en-AU')}
                </span>
              </div>
            ) : (
              <button
                onClick={handleAcceptProposal}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Mark as Accepted (Subject to Site Inspection)</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProposalSection;
