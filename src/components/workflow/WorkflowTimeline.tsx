import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';
import type { WorkflowStage } from '@/types/WorkflowTypes';

const STAGES: { key: WorkflowStage; label: string }[] = [
  { key: 'bill_analysis', label: 'Bill Analysis' },
  { key: 'proposal_sent', label: 'Proposal Sent' },
  { key: 'proposal_accepted', label: 'Proposal Accepted' },
  { key: 'site_inspection_scheduled', label: 'Site Inspection' },
  { key: 'site_inspection_completed', label: 'Inspection Done' },
  { key: 'infrastructure_review', label: 'Infrastructure' },
  { key: 'installation_scheduled', label: 'Install Scheduled' },
  { key: 'installation_in_progress', label: 'Installing' },
  { key: 'installation_completed', label: 'Installed' },
  { key: 'maintenance', label: 'Maintenance' },
];

interface WorkflowTimelineProps {
  currentStage: WorkflowStage;
  compact?: boolean;
}

export default function WorkflowTimeline({ currentStage, compact }: WorkflowTimelineProps) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STAGES.map((stage, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  done ? 'bg-emerald-500' : active ? 'bg-cyan-500' : 'bg-slate-600'
                }`}>
                  {done ? <CheckCircle className="w-4 h-4 text-white" /> :
                   active ? <Clock className="w-3 h-3 text-white" /> :
                   <Circle className="w-3 h-3 text-slate-400" />}
                </div>
                <span className={`text-xs mt-1 whitespace-nowrap ${
                  active ? 'text-cyan-400' : done ? 'text-emerald-400' : 'text-slate-500'
                }`}>{stage.label}</span>
              </div>
              {idx < STAGES.length - 1 && (
                <div className={`flex-1 h-0.5 min-w-[12px] ${done ? 'bg-emerald-500' : 'bg-slate-600'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {STAGES.map((stage, idx) => {
        const done = idx < currentIdx;
        const active = idx === currentIdx;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              done ? 'bg-emerald-500/20' : active ? 'bg-cyan-500/20' : 'bg-slate-700'
            }`}>
              {done ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
               active ? <Clock className="w-4 h-4 text-cyan-400" /> :
               <Circle className="w-4 h-4 text-slate-500" />}
            </div>
            <span className={`text-sm ${active ? 'text-cyan-400 font-medium' : done ? 'text-emerald-400' : 'text-slate-500'}`}>
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
