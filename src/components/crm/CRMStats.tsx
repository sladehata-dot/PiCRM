import React from 'react';
import { Users, UserCheck, CheckCircle, X, TrendingUp } from 'lucide-react';
import type { SessionSummary } from '@/lib/sessionService';

interface CRMStatsProps {
  sessions: SessionSummary[];
}

export default function CRMStats({ sessions }: CRMStatsProps) {
  const total = sessions.length;
  const eligible = sessions.filter(s => s.status === 'eligible').length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  const inProgress = sessions.filter(s => s.status === 'in_progress').length;
  const totalSavings = sessions.reduce((sum, s) => sum + (s.totalSavings || 0), 0);

  const stats = [
    { label: 'Total Leads', value: total, icon: Users, color: 'text-slate-400', bg: 'bg-slate-700/50' },
    { label: 'In Progress', value: inProgress, icon: X, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Eligible', value: eligible, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    {
      label: 'Avg Savings',
      value: totalSavings > 0 && eligible + completed > 0
        ? `$${Math.round(totalSavings / (eligible + completed)).toLocaleString()}/yr`
        : '—',
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map(stat => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`${stat.bg} border border-slate-700 rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-slate-400 text-xs">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
