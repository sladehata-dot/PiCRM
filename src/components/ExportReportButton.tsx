import React from 'react';
import { Download } from 'lucide-react';
import type { AustralianBillData } from '@/types/BillData';

interface ExportReportButtonProps {
  bills: AustralianBillData[];
  variant?: 'default' | 'compact';
  className?: string;
}

export default function ExportReportButton({ bills, variant = 'default', className = '' }: ExportReportButtonProps) {
  const handleExport = () => {
    const latest = bills[0];
    const report = `PI ENERGY REPORT\nGenerated: ${new Date().toLocaleDateString('en-AU')}\nCustomer: ${latest?.customerName || 'N/A'}\nBills: ${bills.length}`;
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pi-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (variant === 'compact') {
    return (
      <button onClick={handleExport} className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors ${className}`} title="Export report">
        <Download className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button onClick={handleExport} className={`flex items-center gap-2 px-3 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 rounded-lg text-sm font-medium transition-colors ${className}`}>
      <Download className="w-4 h-4" />
      Export Report
    </button>
  );
}
