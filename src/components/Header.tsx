import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Upload, History, FileText, Calendar, TrendingUp, RotateCcw, Users } from 'lucide-react';
import { AustralianBillData, getBillingCycleDisplay } from '@/types/BillData';
import { useAppContext } from '@/contexts/AppContext';
import ExportReportButton from './ExportReportButton';
import SaveLoadSession from './SaveLoadSession';
import SessionManager from './SessionManager';

interface HeaderProps {
  activeSection: string;
  setActiveSection: (section: 'upload' | 'analysis' | 'history' | 'comparison' | 'projection') => void;
  bills: AustralianBillData[];
  onLoadSession: (bills: AustralianBillData[]) => void;
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
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  });
};

const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  bills,
  onLoadSession
}) => {
  const { resetEligibility } = useAppContext();
  const billCount = bills.length;
  
  const navItems = [
    {
      id: 'upload',
      label: 'Upload Bills',
      icon: Upload
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: BarChart3,
      requiresBills: true
    },
    {
      id: 'history',
      label: 'Bill History',
      icon: History,
      requiresBills: true
    },
    {
      id: 'comparison',
      label: 'Pi Comparison',
      icon: FileText,
      requiresBills: true
    },
    {
      id: 'projection',
      label: 'Forward Projection',
      icon: TrendingUp,
      requiresBills: true
    }
  ];

  // Calculate coverage data from bills
  const coverageData = useMemo(() => {
    if (bills.length === 0) {
      return {
        totalDays: 0,
        coveragePercent: 0,
        dateRange: null,
        monthsCovered: [] as {
          month: string;
          year: number;
          covered: boolean;
          partial: boolean;
        }[],
        sortedBills: [] as AustralianBillData[]
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

    // Get date range
    const firstBill = sortedBills[0];
    const lastBill = sortedBills[sortedBills.length - 1];
    const startDate = parseDate(firstBill.billingPeriodStart);
    const endDate = parseDate(lastBill.billingPeriodEnd);

    // Calculate coverage percentage (target is 365 days)
    const coveragePercent = Math.min(totalDays / 365 * 100, 100);

    // Generate 12-month timeline
    const monthsCovered: {
      month: string;
      year: number;
      covered: boolean;
      partial: boolean;
    }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthName = monthDate.toLocaleDateString('en-AU', { month: 'short' });

      // Check if this month is covered by any bill
      let covered = false;
      let partial = false;
      for (const period of coveredPeriods) {
        if (period.start <= monthEnd && period.end >= monthDate) {
          if (period.start <= monthDate && period.end >= monthEnd) {
            covered = true;
          } else {
            partial = true;
          }
        }
      }
      monthsCovered.push({
        month: monthName,
        year: monthDate.getFullYear(),
        covered: covered || partial,
        partial: partial && !covered
      });
    }
    
    return {
      totalDays,
      coveragePercent,
      dateRange: startDate && endDate ? {
        start: formatDate(firstBill.billingPeriodStart),
        end: formatDate(lastBill.billingPeriodEnd)
      } : null,
      monthsCovered,
      sortedBills
    };
  }, [bills]);

  const handleNewSession = () => {
    if (window.confirm('Start a new session? This will clear all current data and return to the eligibility questionnaire.')) {
      resetEligibility();
      window.location.reload();
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/6945e624a77072c797b3deb8_1766714546125_accfb13d.png" 
              alt="Energy Bill Analyzer Logo" 
              className="h-10 w-10 rounded-lg object-cover" 
            />
            <div>
              <h1 className="text-xl font-bold text-white">Energy Bill Analysis</h1>
              <p className="text-xs text-slate-400">Internal Analysis Tool - Australia</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isDisabled = item.requiresBills && billCount === 0;
              const isActive = activeSection === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => !isDisabled && setActiveSection(item.id as any)} 
                  disabled={isDisabled} 
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : isDisabled 
                        ? 'text-slate-600 cursor-not-allowed' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.id === 'history' && billCount > 0 && (
                    <span className="bg-cyan-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {billCount}
                    </span>
                  )}
                </button>
              );
            })}
            
            {/* CRM Link */}
            <Link
              to="/crm"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-all border border-purple-500/30"
            >
              <Users className="w-4 h-4" />
              CRM
            </Link>
            
            {/* Session Manager - Database Persistence */}
            <SessionManager variant="header" />
            
            {/* Legacy Save/Load Session Button */}
            <SaveLoadSession bills={bills} onLoadSession={onLoadSession} variant="icon" />
            
            {/* Export Report Button */}
            {billCount > 0 && <ExportReportButton bills={bills} variant="compact" className="ml-2" />}
            
            {/* New Session Button */}
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all ml-2"
              title="Start New Session"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isDisabled = item.requiresBills && billCount === 0;
              const isActive = activeSection === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => !isDisabled && setActiveSection(item.id as any)} 
                  disabled={isDisabled} 
                  className={`
                    p-2 rounded-lg transition-all
                    ${isActive 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : isDisabled 
                        ? 'text-slate-600 cursor-not-allowed' 
                        : 'text-slate-300 hover:bg-slate-800'
                    }
                  `} 
                  title={item.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
            <Link
              to="/crm"
              className="p-2 rounded-lg text-purple-400 hover:bg-purple-500/20 transition-all"
              title="CRM"
            >
              <Users className="w-5 h-5" />
            </Link>
            <button
              onClick={handleNewSession}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Start New Session"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Coverage indicator showing actual bill date ranges */}
      {billCount > 0 && (
        <div className="bg-slate-800/50 px-4 py-3">
          <div className="max-w-7xl mx-auto">
            {/* Date Range Summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <div className="text-sm">
                  <span className="text-slate-400">Coverage: </span>
                  {coverageData.dateRange && (
                    <span className="text-white font-medium">
                      {coverageData.dateRange.start} — {coverageData.dateRange.end}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-slate-400">Bills: </span>
                  <span className="text-cyan-400 font-medium">{billCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400">Days: </span>
                  <span className={`font-medium ${coverageData.totalDays >= 365 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                    {coverageData.totalDays}
                  </span>
                  <span className="text-slate-500">/365</span>
                </div>
                <div className={`text-sm font-medium ${coverageData.coveragePercent >= 100 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {coverageData.coveragePercent.toFixed(0)}% coverage
                </div>
              </div>
            </div>

            {/* 12-Month Timeline */}
            <div className="flex items-center gap-1">
              {coverageData.monthsCovered.map((monthData, index) => (
                <div key={index} className="flex-1 group relative">
                  <div className={`h-6 rounded transition-all ${
                    monthData.covered 
                      ? monthData.partial 
                        ? 'bg-cyan-500/50' 
                        : 'bg-cyan-500' 
                      : 'bg-slate-700'
                  }`} />
                  <div className="text-center mt-1">
                    <span className={`text-[10px] ${monthData.covered ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {monthData.month}
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {monthData.month} {monthData.year}
                      <br />
                      {monthData.covered ? (monthData.partial ? 'Partial coverage' : 'Covered') : 'No data'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Period Tags */}
            {billCount <= 6 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {coverageData.sortedBills.map((bill, index) => (
                  <div key={bill.id} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-1.5 text-xs">
                    <span className="w-5 h-5 bg-cyan-500/20 rounded flex items-center justify-center text-cyan-400 font-medium">
                      {index + 1}
                    </span>
                    <span className="text-white">
                      {formatDate(bill.billingPeriodStart)} — {formatDate(bill.billingPeriodEnd)}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      bill.billingCycle === 'MONTHLY' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : bill.billingCycle === 'BI_MONTHLY' 
                          ? 'bg-amber-500/20 text-amber-400' 
                          : bill.billingCycle === 'QUARTERLY' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-slate-500/20 text-slate-400'
                    }`}>
                      {getBillingCycleDisplay(bill.billingCycle)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Status message */}
            <div className="mt-2 text-xs">
              {coverageData.totalDays >= 365 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full year coverage achieved — analysis is comprehensive
                </span>
              ) : coverageData.totalDays >= 180 ? (
                <span className="text-cyan-400">
                  Good coverage — {365 - coverageData.totalDays} more days needed for full year analysis
                </span>
              ) : (
                <span className="text-slate-500">
                  Upload more bills to improve analysis accuracy ({365 - coverageData.totalDays} more days needed)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
