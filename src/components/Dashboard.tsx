import React from 'react';
import { TrendingUp, TrendingDown, Zap, Sun, DollarSign, Calendar, BarChart3, Clock, AlertCircle } from 'lucide-react';
import { AustralianBillData, PI_RATE_CENTS_KWH, getBillingCycleDisplay } from '@/types/BillData';
import CustomerProfile from './CustomerProfile';
import CustomerQualifiers from './CustomerQualifiers';
import ExportReportButton from './ExportReportButton';
import { useAppContext } from '@/contexts/AppContext';

interface DashboardProps {
  bills: AustralianBillData[];
  onLoadSession?: (bills: AustralianBillData[]) => void;
}

// Helper function to calculate months covered by a bill based on billing cycle
function getMonthsCovered(bill: AustralianBillData): number {
  switch (bill.billingCycle) {
    case 'MONTHLY':
      return 1;
    case 'BI_MONTHLY':
      return 2;
    case 'QUARTERLY':
      return 3;
    case 'OTHER':
    default:
      // Calculate from billing days (approximate)
      return Math.round(bill.billingDays / 30);
  }
}

// Helper function to calculate cost from tariff rates (not from usageCharges)
// This ensures consistency between displayed rates and calculated costs
function calculateBillCostFromRates(bill: AustralianBillData): number {
  let usageCost = 0;
  
  if (bill.tariffType === 'TOU') {
    // TOU: Calculate from individual rate components
    usageCost = (
      (bill.peakUsageKwh * bill.peakRateCentsKwh) +
      (bill.offPeakUsageKwh * bill.offPeakRateCentsKwh) +
      (bill.shoulderUsageKwh * bill.shoulderRateCentsKwh) +
      (bill.controlledLoadKwh * bill.controlledLoadRateCentsKwh)
    ) / 100; // Convert cents to dollars
  } else {
    // FIXED: Simple calculation
    usageCost = (bill.gridImportKwh * bill.singleRateCentsKwh) / 100;
  }
  
  // Add supply charges
  const supplyCost = (bill.billingDays * bill.dailySupplyChargeCents) / 100;
  
  return usageCost + supplyCost;
}

const Dashboard: React.FC<DashboardProps> = ({ bills, onLoadSession }) => {
  const { qualifiers, setQualifiers } = useAppContext();

  // Sort bills by date
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
    const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
    return dateB.getTime() - dateA.getTime();
  });

  // Get the most recent bill for rate information (most accurate as prices always go up)
  const latestBill = sortedBills[0];

  // Calculate total months covered by all bills
  const totalMonthsCovered = bills.reduce((sum, bill) => sum + getMonthsCovered(bill), 0);
  const monthsRemaining = Math.max(0, 12 - totalMonthsCovered);

  // Calculate totals
  const totalUsage = bills.reduce((sum, bill) => sum + bill.totalUsageKwh, 0);
  const totalGridImport = bills.reduce((sum, bill) => sum + bill.gridImportKwh, 0);
  const totalSolarExport = bills.reduce((sum, bill) => sum + bill.solarExportKwh, 0);
  const totalDays = bills.reduce((sum, bill) => sum + bill.billingDays, 0);
  const avgDailyUsage = totalDays > 0 ? totalGridImport / totalDays : 0;

  // Determine primary tariff type
  const tariffCounts = bills.reduce((acc, bill) => {
    acc[bill.tariffType] = (acc[bill.tariffType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const primaryTariff = Object.entries(tariffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as 'TOU' | 'FIXED' | 'DEMAND' || 'FIXED';
  const isTOU = primaryTariff === 'TOU';

  // Use latest bill rates for display (most accurate as prices always go up)
  const currentPeakRate = latestBill?.peakRateCentsKwh || 0;
  const currentOffPeakRate = latestBill?.offPeakRateCentsKwh || 0;
  const currentShoulderRate = latestBill?.shoulderRateCentsKwh || 0;
  const currentFixedRate = latestBill?.singleRateCentsKwh || 0;
  const currentSupplyCharge = latestBill?.dailySupplyChargeCents || 0;
  
  // Check if customer has controlled load
  const hasControlledLoad = latestBill?.controlledLoadKwh > 0 || latestBill?.controlledLoadRateCentsKwh > 0;

  // =====================================================
  // COST CALCULATION FROM TARIFF RATES
  // =====================================================
  // Calculate costs using the TARIFF RATES from bills
  // This ensures consistency: if tariff rate > 30c, 
  // effective rate > 30c, and customer ALWAYS saves with Pi
  // =====================================================
  
  // Calculate total cost from tariff rates (not usageCharges)
  const calculatedTotalCost = bills.reduce((sum, bill) => {
    return sum + calculateBillCostFromRates(bill);
  }, 0);

  // Pi cost: just kWh × 30c, NO supply charge
  const piTotalCost = (totalGridImport * PI_RATE_CENTS_KWH) / 100;
  
  // True savings using calculated costs
  const savings = calculatedTotalCost - piTotalCost;
  const savingsPercent = calculatedTotalCost > 0 ? (savings / calculatedTotalCost) * 100 : 0;

  // Calculate effective rate from tariff-based costs
  const currentEffectiveRate = totalGridImport > 0 
    ? (calculatedTotalCost / totalGridImport) * 100 
    : 0;

  // =====================================================
  // DAILY SAVINGS CALCULATION (with annualized supply charge)
  // =====================================================
  // Daily savings = Daily usage savings + Daily supply charge savings
  // Supply charge is annualized (365 days) then divided by actual days
  // =====================================================
  const annualSupplyChargeSavings = (currentSupplyCharge * 365) / 100; // Pi has no supply charge
  const dailySupplyChargeSavings = annualSupplyChargeSavings / 365;
  const dailyUsageSavings = avgDailyUsage * (currentEffectiveRate - PI_RATE_CENTS_KWH) / 100;
  const totalDailySavings = dailyUsageSavings + dailySupplyChargeSavings;
  
  // Annualized savings (projected to full year)
  const annualizedSavings = totalDays > 0 ? (savings / totalDays) * 365 : 0;

  // Period data for chart - use calculated costs from tariff rates
  const periodData = sortedBills.slice(0, 12).reverse().map(bill => {
    // Calculate cost from tariff rates
    const calculatedCost = calculateBillCostFromRates(bill);
    
    return {
      periodStart: bill.billingPeriodStart,
      periodEnd: bill.billingPeriodEnd,
      periodLabel: `${bill.billingPeriodStart.split('/').slice(0, 2).join('/')}-${bill.billingPeriodEnd.split('/').slice(0, 2).join('/')}`,
      shortLabel: bill.billingPeriodEnd.split('/').slice(0, 2).join('/'),
      days: bill.billingDays,
      cycle: getBillingCycleDisplay(bill.billingCycle),
      usage: bill.totalUsageKwh,
      gridImport: bill.gridImportKwh,
      solarExport: bill.solarExportKwh,
      avgDailyKwh: bill.averageDailyKwh,
      cost: calculatedCost,
      piCost: (bill.gridImportKwh * PI_RATE_CENTS_KWH) / 100,
      tariffType: bill.tariffType,
      effectiveRate: bill.gridImportKwh > 0 ? (calculatedCost / bill.gridImportKwh) * 100 : 0
    };
  });


  const maxUsage = Math.max(...periodData.map(d => d.usage), 1);
  const maxCost = Math.max(...periodData.map(d => Math.max(d.cost, d.piCost)), 1);
  const maxDailyKwh = Math.max(...periodData.map(d => d.avgDailyKwh), 1);


  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Energy Analysis Dashboard</h2>
            <p className="text-slate-400">
              Analyzing {bills.length} bill{bills.length !== 1 ? 's' : ''} 
              {totalDays > 0 && ` covering ${totalMonthsCovered} month${totalMonthsCovered !== 1 ? 's' : ''} (${totalDays} days)`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {monthsRemaining > 0 && (
              <div className="bg-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Upload {monthsRemaining} more month{monthsRemaining !== 1 ? 's' : ''} of bills for complete 12-month analysis
              </div>
            )}
            <ExportReportButton bills={bills} />
          </div>
        </div>

        {/* Customer Profile */}
        <CustomerProfile bills={sortedBills} />

        {/* Customer Qualifiers - Prominently displayed */}
        <CustomerQualifiers qualifiers={qualifiers} onUpdate={setQualifiers} />

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-cyan-400" />
              </div>
              <span className="text-slate-400 text-sm">Grid Import</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalGridImport.toLocaleString()} kWh</p>
            <p className="text-sm text-slate-500 mt-1">
              {avgDailyUsage.toFixed(1)} kWh/day avg
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Sun className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-slate-400 text-sm">Solar Export</span>
            </div>
            <p className="text-2xl font-bold text-white">{totalSolarExport.toLocaleString()} kWh</p>
            <p className="text-sm text-slate-500 mt-1">
              {totalSolarExport > 0 ? `${((totalSolarExport / (totalUsage + totalSolarExport)) * 100).toFixed(0)}% of generation` : 'No solar'}
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-400" />
              </div>
              <span className="text-slate-400 text-sm">Your Cost</span>
            </div>
            <p className="text-2xl font-bold text-white">${calculatedTotalCost.toFixed(2)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {currentEffectiveRate.toFixed(1)}c/kWh effective rate
            </p>
          </div>


          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${savings > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                {savings > 0 ? <TrendingDown className="w-5 h-5 text-emerald-400" /> : <TrendingUp className="w-5 h-5 text-red-400" />}
              </div>
              <span className="text-slate-400 text-sm">Pi Savings</span>
            </div>
            <p className={`text-2xl font-bold ${savings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${Math.abs(savings).toFixed(2)}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {savingsPercent.toFixed(1)}% {savings > 0 ? 'savings' : 'more'}
            </p>
          </div>
        </div>

        {/* Savings Highlight - Show if customer would save with Pi */}
        {savings > 0 && currentEffectiveRate > PI_RATE_CENTS_KWH && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-400">
                  You could save ${savings.toFixed(2)} with Pi Energy!
                </h3>
                <p className="text-slate-300 text-sm">
                  Your effective rate of {currentEffectiveRate.toFixed(1)}c/kWh is {(currentEffectiveRate - PI_RATE_CENTS_KWH).toFixed(1)}c higher than Pi's {PI_RATE_CENTS_KWH}c/kWh flat rate.
                  View the Pi Comparison tab for detailed analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Average Daily Usage by Period */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Average Daily Usage by Billing Period
          </h3>
          <div className="h-72 flex items-end gap-2">
            {periodData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div className="w-full flex flex-col gap-0.5" style={{ height: '220px' }}>
                  <div 
                    className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t transition-all hover:from-cyan-500 hover:to-cyan-300"
                    style={{ height: `${(data.avgDailyKwh / maxDailyKwh) * 100}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-white block">
                    {data.avgDailyKwh.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 block whitespace-nowrap">
                    {data.shortLabel}
                  </span>
                  <span className="text-xs text-slate-600 block">
                    {data.days}d
                  </span>
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-700 rounded-lg p-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                  <p className="text-white font-medium">{data.periodStart} - {data.periodEnd}</p>
                  <p className="text-slate-300">{data.cycle} ({data.days} days)</p>
                  <p className="text-cyan-400">{data.avgDailyKwh.toFixed(2)} kWh/day</p>
                  <p className="text-slate-400">Total: {data.gridImport.toLocaleString()} kWh</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">
            Average daily kWh usage for each billing period (hover for details)
          </p>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Usage Chart */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Period Usage (kWh)
            </h3>
            <div className="h-64 flex items-end gap-2">
              {periodData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex flex-col gap-0.5" style={{ height: '200px' }}>
                    {/* Solar Export */}
                    {data.solarExport > 0 && (
                      <div 
                        className="w-full bg-amber-500/50 rounded-t"
                        style={{ height: `${(data.solarExport / maxUsage) * 100}%` }}
                      />
                    )}
                    {/* Grid Import */}
                    <div 
                      className="w-full bg-cyan-500 rounded-t"
                      style={{ height: `${(data.gridImport / maxUsage) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 transform -rotate-45 origin-center whitespace-nowrap">
                    {data.shortLabel}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-700 rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <p className="text-white">{data.periodStart} - {data.periodEnd}</p>
                    <p className="text-cyan-400">Grid: {data.gridImport.toLocaleString()} kWh</p>
                    {data.solarExport > 0 && (
                      <p className="text-amber-400">Solar: {data.solarExport.toLocaleString()} kWh</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-500 rounded" />
                <span className="text-xs text-slate-400">Grid Import</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500/50 rounded" />
                <span className="text-xs text-slate-400">Solar Export</span>
              </div>
            </div>
          </div>

          {/* Cost Comparison Chart */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Cost Comparison
            </h3>
            <div className="h-64 flex items-end gap-2">
              {periodData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex gap-0.5" style={{ height: '200px' }}>
                    {/* Current Cost */}
                    <div 
                      className="flex-1 bg-red-500/70 rounded-t self-end"
                      style={{ height: `${(data.cost / maxCost) * 100}%` }}
                    />
                    {/* Pi Cost */}
                    <div 
                      className="flex-1 bg-emerald-500 rounded-t self-end"
                      style={{ height: `${(data.piCost / maxCost) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 transform -rotate-45 origin-center whitespace-nowrap">
                    {data.shortLabel}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-700 rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <p className="text-white">{data.periodStart} - {data.periodEnd}</p>
                    <p className="text-red-400">Your Cost: ${data.cost.toFixed(2)}</p>
                    <p className="text-emerald-400">Pi Cost: ${data.piCost.toFixed(2)}</p>
                    <p className="text-slate-300">Savings: ${(data.cost - data.piCost).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500/70 rounded" />
                <span className="text-xs text-slate-400">Your Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded" />
                <span className="text-xs text-slate-400">Pi Energy @ {PI_RATE_CENTS_KWH}c/kWh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Analysis - Shows FIXED or TOU based on tariff type */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            Rate Analysis 
            <span className="text-sm font-normal text-slate-400 ml-2">
              ({isTOU ? `Time of Use Tariff${hasControlledLoad ? ' + Controlled Load' : ''}` : 'Fixed Rate Tariff'})
            </span>
            <span className="text-xs font-normal text-slate-500 ml-2">
              (Based on most recent bill rates)
            </span>
          </h3>
          
          {isTOU ? (
            // TOU Rate Display - For controlled load, only show peak rate
            hasControlledLoad ? (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm mb-1">Peak Rate</p>
                  <p className="text-xl font-bold text-white">{currentPeakRate.toFixed(2)}c/kWh</p>
                  <p className="text-xs text-slate-500 mt-1">Primary rate (excl. controlled load)</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Daily Supply</p>
                  <p className="text-xl font-bold text-white">{currentSupplyCharge.toFixed(2)}c/day</p>
                  <p className="text-xs text-slate-500 mt-1">${((currentSupplyCharge * 365) / 100).toFixed(2)}/year</p>
                </div>
                <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
                  <p className="text-emerald-400 text-sm mb-1">Pi Rate</p>
                  <p className="text-xl font-bold text-emerald-400">{PI_RATE_CENTS_KWH}c/kWh</p>
                  <p className="text-xs text-emerald-400/70 mt-1">Flat rate, no supply charge</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 text-sm mb-1">Peak Rate</p>
                  <p className="text-xl font-bold text-white">{currentPeakRate.toFixed(2)}c/kWh</p>
                  <p className="text-xs text-slate-500 mt-1">Weekdays 2pm-8pm</p>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 text-sm mb-1">Off-Peak Rate</p>
                  <p className="text-xl font-bold text-white">{currentOffPeakRate.toFixed(2)}c/kWh</p>
                  <p className="text-xs text-slate-500 mt-1">10pm-7am</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <p className="text-amber-400 text-sm mb-1">Shoulder Rate</p>
                  <p className="text-xl font-bold text-white">{currentShoulderRate.toFixed(2)}c/kWh</p>
                  <p className="text-xs text-slate-500 mt-1">7am-2pm, 8pm-10pm</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-1">Daily Supply</p>
                  <p className="text-xl font-bold text-white">{currentSupplyCharge.toFixed(2)}c/day</p>
                  <p className="text-xs text-slate-500 mt-1">${((currentSupplyCharge * 365) / 100).toFixed(2)}/year</p>
                </div>
                <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
                  <p className="text-emerald-400 text-sm mb-1">Pi Rate</p>
                  <p className="text-xl font-bold text-emerald-400">{PI_RATE_CENTS_KWH}c/kWh</p>
                  <p className="text-xs text-emerald-400/70 mt-1">Flat rate, no supply charge</p>
                </div>
              </div>
            )
          ) : (
            // FIXED Rate Display
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4">
                <p className="text-cyan-400 text-sm mb-1">Fixed Rate</p>
                <p className="text-xl font-bold text-white">{currentFixedRate.toFixed(2)}c/kWh</p>
                <p className="text-xs text-slate-500 mt-1">Same rate 24/7</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm mb-1">Daily Supply</p>
                <p className="text-xl font-bold text-white">{currentSupplyCharge.toFixed(2)}c/day</p>
                <p className="text-xs text-slate-500 mt-1">${((currentSupplyCharge * 365) / 100).toFixed(2)}/year</p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-purple-400 text-sm mb-1">Effective Rate</p>
                <p className="text-xl font-bold text-white">{currentEffectiveRate.toFixed(2)}c/kWh</p>
                <p className="text-xs text-slate-500 mt-1">Including all charges</p>
              </div>
              <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-emerald-400 text-sm mb-1">Pi Rate</p>
                <p className="text-xl font-bold text-emerald-400">{PI_RATE_CENTS_KWH}c/kWh</p>
                <p className="text-xs text-emerald-400/70 mt-1">Flat rate, no supply charge</p>
              </div>
            </div>
          )}

          {/* Rate Comparison Summary */}
          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
            <h4 className="text-white font-medium mb-3">Rate Comparison Summary</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Your Tariff Rate</p>
                <p className="text-white font-medium">
                  {isTOU 
                    ? hasControlledLoad
                      ? `${currentPeakRate.toFixed(1)}c/kWh (peak rate)`
                      : `${currentPeakRate.toFixed(1)}c (peak) / ${currentOffPeakRate.toFixed(1)}c (off-peak)`
                    : `${currentFixedRate.toFixed(2)}c/kWh (fixed)`
                  }
                </p>
              </div>
              <div>
                <p className="text-slate-400">Your Effective Rate (incl. supply)</p>
                <p className="text-white font-medium">{currentEffectiveRate.toFixed(2)}c/kWh</p>
              </div>
              <div>
                <p className="text-slate-400">Pi Energy Rate</p>
                <p className="text-emerald-400 font-medium">{PI_RATE_CENTS_KWH}c/kWh (no other fees)</p>
              </div>
            </div>
          </div>
        </div>



        {/* TOU Usage Breakdown - Only show if TOU tariff */}
        {isTOU && bills.some(b => b.tariffType === 'TOU') && (
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">Time of Use Breakdown</h3>
            <div className="grid md:grid-cols-4 gap-4">
              {(() => {
                const totalPeak = bills.reduce((sum, b) => sum + b.peakUsageKwh, 0);
                const totalOffPeak = bills.reduce((sum, b) => sum + b.offPeakUsageKwh, 0);
                const totalShoulder = bills.reduce((sum, b) => sum + b.shoulderUsageKwh, 0);
                const totalControlled = bills.reduce((sum, b) => sum + b.controlledLoadKwh, 0);
                const total = totalPeak + totalOffPeak + totalShoulder + totalControlled;
                
                return (
                  <>
                    <div className="bg-red-500/20 rounded-lg p-4">
                      <p className="text-red-400 text-sm mb-1">Peak Usage</p>
                      <p className="text-xl font-bold text-white">{totalPeak.toLocaleString()} kWh</p>
                      <p className="text-xs text-slate-400 mt-1">{total > 0 ? ((totalPeak / total) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                    <div className="bg-blue-500/20 rounded-lg p-4">
                      <p className="text-blue-400 text-sm mb-1">Off-Peak Usage</p>
                      <p className="text-xl font-bold text-white">{totalOffPeak.toLocaleString()} kWh</p>
                      <p className="text-xs text-slate-400 mt-1">{total > 0 ? ((totalOffPeak / total) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                    <div className="bg-amber-500/20 rounded-lg p-4">
                      <p className="text-amber-400 text-sm mb-1">Shoulder Usage</p>
                      <p className="text-xl font-bold text-white">{totalShoulder.toLocaleString()} kWh</p>
                      <p className="text-xs text-slate-400 mt-1">{total > 0 ? ((totalShoulder / total) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                    <div className="bg-purple-500/20 rounded-lg p-4">
                      <p className="text-purple-400 text-sm mb-1">Controlled Load</p>
                      <p className="text-xl font-bold text-white">{totalControlled.toLocaleString()} kWh</p>
                      <p className="text-xs text-slate-400 mt-1">{total > 0 ? ((totalControlled / total) * 100).toFixed(1) : 0}% of total</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Billing Period Summary */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Billing Period Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400 font-medium">Period</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Days</th>
                  <th className="text-center py-2 px-3 text-slate-400 font-medium">Type</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Grid (kWh)</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Daily Avg</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Tariff</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Your Cost</th>
                  <th className="text-right py-2 px-3 text-slate-400 font-medium">Eff. Rate</th>
                </tr>
              </thead>
              <tbody>
                {periodData.map((data, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-2 px-3 text-white">{data.periodStart} - {data.periodEnd}</td>
                    <td className="py-2 px-3 text-center text-slate-300">{data.days}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        data.cycle === 'Monthly' ? 'bg-cyan-500/20 text-cyan-400' :
                        data.cycle === 'Quarterly' ? 'bg-purple-500/20 text-purple-400' :
                        data.cycle === 'Bi-Monthly' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {data.cycle}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-white">{data.gridImport.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-cyan-400">{data.avgDailyKwh.toFixed(1)} kWh</td>
                    <td className="py-2 px-3 text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        data.tariffType === 'TOU' ? 'bg-purple-500/20 text-purple-400' :
                        data.tariffType === 'DEMAND' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {data.tariffType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-white">${data.cost.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{data.effectiveRate.toFixed(1)}c</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
