import React, { useMemo } from 'react';
import { TrendingDown, TrendingUp, DollarSign, Zap, Download, CheckCircle, Calendar, Clock, AlertTriangle, Info } from 'lucide-react';
import { AustralianBillData, PI_RATE_CENTS_KWH, PI_NAME, YearlyAnalysis, PiComparison as PiComparisonType, getBillingCycleDisplay } from '@/types/BillData';
import { Button } from '@/components/ui/button';

interface PiComparisonProps {
  bills: AustralianBillData[];
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

const PiComparison: React.FC<PiComparisonProps> = ({ bills }) => {
  const analysis = useMemo(() => {
    // Sort bills by date to get the most recent one (most accurate rates as prices always go up)
    const sortedBills = [...bills].sort((a, b) => {
      const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
      const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    const latestBill = sortedBills[0] || null;
    
    // Determine if customer has controlled load
    const hasControlledLoad = latestBill ? (latestBill.controlledLoadKwh > 0 || latestBill.controlledLoadRateCentsKwh > 0) : false;
    
    // Calculate totals
    const totalUsageKwh = bills.reduce((sum, b) => sum + b.totalUsageKwh, 0);
    const totalGridImportKwh = bills.reduce((sum, b) => sum + b.gridImportKwh, 0);
    const totalSolarExportKwh = bills.reduce((sum, b) => sum + b.solarExportKwh, 0);
    const totalDays = bills.reduce((sum, b) => sum + b.billingDays, 0);
    const averageDailyKwh = totalDays > 0 ? totalGridImportKwh / totalDays : 0;

    // Get latest rates for display
    const latestSupplyChargeCents = latestBill?.dailySupplyChargeCents || 0;
    const latestPeakRate = latestBill?.peakRateCentsKwh || 0;
    const latestOffPeakRate = latestBill?.offPeakRateCentsKwh || 0;
    const latestShoulderRate = latestBill?.shoulderRateCentsKwh || 0;
    const latestFixedRate = latestBill?.singleRateCentsKwh || 0;
    const isTOU = latestBill?.tariffType === 'TOU';

    // =====================================================
    // COST CALCULATION FROM TARIFF RATES
    // =====================================================
    // Calculate costs using the TARIFF RATES from bills
    // This ensures consistency: if tariff rate > 30c, 
    // effective rate > 30c, and customer ALWAYS saves with Pi
    // =====================================================
    
    // Calculate current cost from tariff rates (not usageCharges)
    const calculatedCurrentCost = bills.reduce((sum, bill) => {
      return sum + calculateBillCostFromRates(bill);
    }, 0);

    // Pi cost: just kWh × 30c, NO supply charge, NO other fees
    const piTotalCost = (totalGridImportKwh * PI_RATE_CENTS_KWH) / 100;
    
    // True savings = what you pay now - what you'd pay with Pi
    const trueSavings = calculatedCurrentCost - piTotalCost;
    const savingsPercentage = calculatedCurrentCost > 0 ? (trueSavings / calculatedCurrentCost) * 100 : 0;

    // Calculate effective rate from tariff-based costs
    const calculatedEffectiveRate = totalGridImportKwh > 0 
      ? (calculatedCurrentCost / totalGridImportKwh) * 100 
      : 0;

    // Period data for chart
    const periodData: PiComparisonType[] = sortedBills.slice().reverse().map(bill => {
      // Calculate cost from tariff rates
      const calculatedCost = calculateBillCostFromRates(bill);
      const piCost = (bill.gridImportKwh * PI_RATE_CENTS_KWH) / 100;
      
      return {
        period: `${bill.billingPeriodStart} - ${bill.billingPeriodEnd}`,
        billingPeriodStart: bill.billingPeriodStart,
        billingPeriodEnd: bill.billingPeriodEnd,
        billingDays: bill.billingDays,
        billingCycle: bill.billingCycle,
        currentCost: calculatedCost,
        piCost,
        savings: calculatedCost - piCost,
        usageKwh: bill.gridImportKwh,
        averageDailyKwh: bill.averageDailyKwh
      };
    });

    // Get the display rate (for showing to user)
    const displayRate = isTOU ? latestPeakRate : latestFixedRate;

    return {
      totalUsageKwh,
      totalGridImportKwh,
      totalSolarExportKwh,
      totalDays,
      averageDailyKwh,
      totalCurrentCost: calculatedCurrentCost,
      totalPiCost: piTotalCost,
      totalSavings: trueSavings,
      savingsPercentage,
      periodData,
      currentDisplayRate: displayRate,
      currentEffectiveRateCentsKwh: calculatedEffectiveRate,
      latestBill,
      hasControlledLoad,
      latestSupplyChargeCents,
      latestPeakRate,
      latestOffPeakRate,
      latestShoulderRate,
      latestFixedRate,
      isTOU
    };
  }, [bills]);

  const exportReport = () => {
    const latestBill = analysis.latestBill;
    const report = `
PI ENERGY COMPARISON REPORT
===========================
Generated: ${new Date().toLocaleDateString('en-AU')}

CUSTOMER DETAILS
----------------
Name: ${latestBill?.customerName || 'N/A'}
NMI: ${latestBill?.nmi || 'N/A'}
Address: ${latestBill?.serviceAddress || 'N/A'}
Current Retailer: ${latestBill?.retailer || 'N/A'}
Power Phases: ${latestBill?.powerPhases || 'N/A'}
Solar System: ${latestBill?.hasSolar ? (latestBill?.solarSystemSize ? `${latestBill.solarSystemSize}kW` : 'Yes') : 'No'}

ANALYSIS PERIOD
---------------
Bills Analyzed: ${bills.length}
Total Days Covered: ${analysis.totalDays}
Period Coverage: ${analysis.periodData[0]?.period || 'N/A'} to ${analysis.periodData[analysis.periodData.length - 1]?.period || 'N/A'}

USAGE SUMMARY
-------------
Total Grid Import: ${analysis.totalGridImportKwh.toLocaleString()} kWh
Total Solar Export: ${analysis.totalSolarExportKwh.toLocaleString()} kWh
Average Daily Usage: ${analysis.averageDailyKwh.toFixed(2)} kWh/day

RATE ANALYSIS
-------------
${analysis.isTOU 
  ? `Peak Rate: ${analysis.latestPeakRate.toFixed(2)}c/kWh
Off-Peak Rate: ${analysis.latestOffPeakRate.toFixed(2)}c/kWh
Shoulder Rate: ${analysis.latestShoulderRate.toFixed(2)}c/kWh`
  : `Fixed Rate: ${analysis.latestFixedRate.toFixed(2)}c/kWh`
}
Daily Supply Charge: ${analysis.latestSupplyChargeCents.toFixed(2)}c/day ($${((analysis.latestSupplyChargeCents * 365) / 100).toFixed(0)}/year)
Your Effective Rate: ${analysis.currentEffectiveRateCentsKwh.toFixed(2)}c/kWh (including supply charges)
Pi Energy Rate: ${PI_RATE_CENTS_KWH}c/kWh (flat, no supply charge)

COST COMPARISON
---------------
Your Cost (from tariff rates): $${analysis.totalCurrentCost.toFixed(2)}
Pi Energy Cost: $${analysis.totalPiCost.toFixed(2)}
  - ${analysis.totalGridImportKwh.toLocaleString()} kWh × ${PI_RATE_CENTS_KWH}c = $${analysis.totalPiCost.toFixed(2)}
  - No daily supply charge

YOUR SAVINGS WITH PI: $${analysis.totalSavings.toFixed(2)} (${analysis.savingsPercentage.toFixed(1)}%)

PI ENERGY PRICING
-----------------
Rate: ${PI_RATE_CENTS_KWH}c/kWh (flat rate - same 24/7)
Daily Supply Charge: $0.00
No peak/off-peak rates
No other fees

PERIOD BREAKDOWN
----------------
${analysis.periodData.map(p => 
  `${p.period} (${p.billingDays} days, ${getBillingCycleDisplay(p.billingCycle)}):
   Usage: ${p.usageKwh.toLocaleString()} kWh (${p.averageDailyKwh.toFixed(1)} kWh/day avg)
   Your Cost: $${p.currentCost.toFixed(2)} | Pi Cost: $${p.piCost.toFixed(2)} | Savings: $${p.savings.toFixed(2)}`
).join('\n\n')}

ANNUALIZED PROJECTION (based on ${analysis.totalDays} days of data)
-------------------------------------------------------------------
Projected Annual Usage: ${Math.round((analysis.totalGridImportKwh / analysis.totalDays) * 365).toLocaleString()} kWh
Projected Annual Cost (Current): $${((analysis.totalCurrentCost / analysis.totalDays) * 365).toFixed(2)}
Projected Annual Cost (Pi): $${((analysis.totalPiCost / analysis.totalDays) * 365).toFixed(2)}
Projected Annual Savings: $${((analysis.totalSavings / analysis.totalDays) * 365).toFixed(2)}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pi-energy-comparison-${latestBill?.nmi || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const maxCost = Math.max(...analysis.periodData.map(d => Math.max(d.currentCost, d.piCost)), 1);

  // Calculate annualized figures based on actual days
  const annualizedUsage = analysis.totalDays > 0 ? Math.round((analysis.totalGridImportKwh / analysis.totalDays) * 365) : 0;
  const annualizedCurrentCost = analysis.totalDays > 0 ? (analysis.totalCurrentCost / analysis.totalDays) * 365 : 0;
  const annualizedPiCost = analysis.totalDays > 0 ? (analysis.totalPiCost / analysis.totalDays) * 365 : 0;
  const annualizedSavings = annualizedCurrentCost - annualizedPiCost;

  const latestBill = analysis.latestBill;

  // Calculate the rate difference for emphasis
  const rateDifference = analysis.currentEffectiveRateCentsKwh - PI_RATE_CENTS_KWH;
  const savingsPerKwh = rateDifference > 0 ? rateDifference : 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Pi Energy Comparison</h2>
            <p className="text-slate-400">
              Compare your current costs with {PI_NAME} at {PI_RATE_CENTS_KWH}c/kWh flat rate
            </p>
          </div>
          <Button onClick={exportReport} className="bg-cyan-500 hover:bg-cyan-600">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Coverage Info */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">Bills Analyzed:</span>
            <span className="text-white font-medium">{bills.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">Days Covered:</span>
            <span className="text-white font-medium">{analysis.totalDays}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-slate-400">Avg Daily Usage:</span>
            <span className="text-white font-medium">{analysis.averageDailyKwh.toFixed(1)} kWh</span>
          </div>
          {analysis.totalDays < 365 && (
            <div className="bg-amber-500/20 text-amber-400 px-3 py-1 rounded-lg text-sm">
              {365 - analysis.totalDays} more days needed for full year
            </div>
          )}
        </div>

        {/* Key Insight - Rate Comparison - ALWAYS show if effective rate > Pi rate */}
        {analysis.currentEffectiveRateCentsKwh > PI_RATE_CENTS_KWH && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-emerald-400 mb-2">
                  You're paying {analysis.currentEffectiveRateCentsKwh.toFixed(1)}c/kWh - Pi charges just {PI_RATE_CENTS_KWH}c/kWh!
                </h3>
                <p className="text-slate-300 mb-3">
                  Your effective rate is <span className="text-white font-bold">{rateDifference.toFixed(1)}c higher</span> than Pi Energy's flat rate. 
                  That's <span className="text-emerald-400 font-bold">${annualizedSavings.toFixed(0)} projected annual savings</span>!
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">Your Effective Rate:</span>
                    <span className="text-red-400 font-bold ml-2">{analysis.currentEffectiveRateCentsKwh.toFixed(1)}c/kWh</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">Pi Rate:</span>
                    <span className="text-emerald-400 font-bold ml-2">{PI_RATE_CENTS_KWH}c/kWh</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">You Save:</span>
                    <span className="text-emerald-400 font-bold ml-2">{rateDifference.toFixed(1)}c per kWh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Calculation Method Info */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-cyan-400 font-medium">How We Calculate Your Costs</p>
              <p className="text-slate-300 text-sm mt-1">
                We calculate your costs using your <strong>tariff rates</strong> from your bills, ensuring accuracy and consistency.
              </p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1">
                {analysis.isTOU ? (
                  <>
                    <li>• Peak Rate: <span className="text-red-400 font-medium">{analysis.latestPeakRate.toFixed(2)}c/kWh</span></li>
                    <li>• Off-Peak Rate: <span className="text-blue-400 font-medium">{analysis.latestOffPeakRate.toFixed(2)}c/kWh</span></li>
                    <li>• Shoulder Rate: <span className="text-amber-400 font-medium">{analysis.latestShoulderRate.toFixed(2)}c/kWh</span></li>
                  </>
                ) : (
                  <li>• Fixed Rate: <span className="text-cyan-400 font-medium">{analysis.latestFixedRate.toFixed(2)}c/kWh</span></li>
                )}
                <li>• Daily Supply Charge: <span className="text-white font-medium">${(analysis.latestSupplyChargeCents / 100).toFixed(2)}/day</span> (${((analysis.latestSupplyChargeCents * 365) / 100).toFixed(0)}/year)</li>
                <li>• Your Effective Rate: <span className="text-white font-medium">{analysis.currentEffectiveRateCentsKwh.toFixed(2)}c/kWh</span> (including all charges)</li>
                <li>• Pi Energy: <span className="text-emerald-400 font-medium">{PI_RATE_CENTS_KWH}c/kWh flat + $0 supply charge</span></li>
              </ul>
              {analysis.hasControlledLoad && (
                <p className="text-amber-400 text-sm mt-2">
                  Note: Controlled load detected - costs include controlled load at discounted rates
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-red-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Your Cost</p>
            <p className="text-3xl font-bold text-white">${analysis.totalCurrentCost.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {analysis.totalGridImportKwh.toLocaleString()} kWh @ {analysis.currentEffectiveRateCentsKwh.toFixed(1)}c effective
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Pi Energy Cost</p>
            <p className="text-3xl font-bold text-emerald-400">${analysis.totalPiCost.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {analysis.totalGridImportKwh.toLocaleString()} kWh @ {PI_RATE_CENTS_KWH}c (no supply)
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl p-6 border border-emerald-500/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-emerald-500/30 rounded-xl flex items-center justify-center">
                {analysis.totalSavings > 0 
                  ? <TrendingDown className="w-6 h-6 text-emerald-400" />
                  : <TrendingUp className="w-6 h-6 text-red-400" />
                }
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Your Savings</p>
            <p className={`text-3xl font-bold ${analysis.totalSavings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ${Math.abs(analysis.totalSavings).toFixed(2)}
            </p>
            <p className="text-xs text-emerald-400/70 mt-1">
              {analysis.savingsPercentage.toFixed(1)}% {analysis.totalSavings > 0 ? 'savings' : 'more'}
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-1">Total Grid Import</p>
            <p className="text-3xl font-bold text-white">{analysis.totalGridImportKwh.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">kWh analyzed</p>
          </div>
        </div>

        {/* Rate Comparison Summary */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Rate Comparison Summary</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm mb-1">Your Effective Rate</p>
              <p className="text-2xl font-bold text-white">{analysis.currentEffectiveRateCentsKwh.toFixed(2)}c/kWh</p>
              <p className="text-xs text-slate-500 mt-1">Including supply charges</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-1">Your Supply Charge</p>
              <p className="text-2xl font-bold text-white">${(analysis.latestSupplyChargeCents / 100).toFixed(2)}/day</p>
              <p className="text-xs text-slate-500 mt-1">${((analysis.latestSupplyChargeCents * 365) / 100).toFixed(0)}/year</p>
            </div>
            <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
              <p className="text-emerald-400 text-sm mb-1">Pi Energy Rate</p>
              <p className="text-2xl font-bold text-emerald-400">{PI_RATE_CENTS_KWH}c/kWh</p>
              <p className="text-xs text-emerald-400/70 mt-1">Flat rate, no supply charge</p>
            </div>
            <div className={`rounded-lg p-4 border ${rateDifference > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className={`text-sm mb-1 ${rateDifference > 0 ? 'text-emerald-400' : 'text-red-400'}`}>You Save Per kWh</p>
              <p className={`text-2xl font-bold ${rateDifference > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {rateDifference > 0 ? rateDifference.toFixed(2) : '0.00'}c
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {rateDifference > 0 ? 'Lower rate with Pi' : 'Similar or lower rate'}
              </p>
            </div>
          </div>
        </div>

        {/* Pi Benefits */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-xl p-6 border border-emerald-500/20">
          <h3 className="text-lg font-semibold text-white mb-4">Why Pi Energy?</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Simple Pricing</p>
                <p className="text-sm text-slate-400">{PI_RATE_CENTS_KWH}c/kWh flat rate, no hidden fees</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">No Supply Charge</p>
                <p className="text-sm text-slate-400">Save ${((analysis.latestSupplyChargeCents || 100) / 100 * 365).toFixed(0)}/year on daily fees</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">No Peak Rates</p>
                <p className="text-sm text-slate-400">Same rate 24/7, every day</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-medium">Transparent</p>
                <p className="text-sm text-slate-400">What you see is what you pay</p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Comparison Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-6">Cost Comparison by Billing Period</h3>
          <div className="h-80">
            <div className="h-64 flex items-end gap-3">
              {analysis.periodData.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div className="w-full flex gap-1 h-52">
                    {/* Current Cost Bar */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div 
                        className="w-full bg-red-500/70 rounded-t transition-all hover:bg-red-500"
                        style={{ height: `${(data.currentCost / maxCost) * 100}%` }}
                      >
                        <div className="text-xs text-white text-center pt-1 font-medium">
                          ${data.currentCost.toFixed(0)}
                        </div>
                      </div>
                    </div>
                    {/* Pi Cost Bar */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div 
                        className="w-full bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                        style={{ height: `${(data.piCost / maxCost) * 100}%` }}
                      >
                        <div className="text-xs text-white text-center pt-1 font-medium">
                          ${data.piCost.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-slate-500 whitespace-nowrap block">
                      {data.billingPeriodEnd.split('/').slice(0, 2).join('/')}
                    </span>
                    <span className="text-xs text-slate-600 block">
                      {data.billingDays}d
                    </span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-700 rounded-lg p-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    <p className="text-white font-medium">{data.period}</p>
                    <p className="text-slate-300">{getBillingCycleDisplay(data.billingCycle)} ({data.billingDays} days)</p>
                    <p className="text-cyan-400">{data.averageDailyKwh.toFixed(1)} kWh/day avg</p>
                    <p className="text-red-400">Your Cost: ${data.currentCost.toFixed(2)}</p>
                    <p className="text-emerald-400">Pi Cost: ${data.piCost.toFixed(2)}</p>
                    <p className="text-white font-medium">You Save: ${data.savings.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500/70 rounded" />
              <span className="text-sm text-slate-400">Your Cost (from tariff rates)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded" />
              <span className="text-sm text-slate-400">Pi Energy @ {PI_RATE_CENTS_KWH}c/kWh</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Detailed Breakdown by Billing Period</h3>
            <p className="text-sm text-slate-400">Costs calculated from your tariff rates</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/30">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Billing Period</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-400">Days</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Usage (kWh)</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Daily Avg</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Your Cost</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Pi Cost</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Savings</th>
                </tr>
              </thead>
              <tbody>
                {analysis.periodData.map((data, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-white text-sm">{data.period}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm text-center">{data.billingDays}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        data.billingCycle === 'MONTHLY' ? 'bg-cyan-500/20 text-cyan-400' :
                        data.billingCycle === 'QUARTERLY' ? 'bg-purple-500/20 text-purple-400' :
                        data.billingCycle === 'BI_MONTHLY' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {getBillingCycleDisplay(data.billingCycle)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm text-right">{data.usageKwh.toLocaleString()}</td>
                    <td className="px-4 py-3 text-cyan-400 text-sm text-right">{data.averageDailyKwh.toFixed(1)}</td>
                    <td className="px-4 py-3 text-white text-sm text-right">${data.currentCost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-400 text-sm text-right">${data.piCost.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${data.savings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {data.savings > 0 ? '+' : ''}${data.savings.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-700/50 font-medium">
                  <td className="px-4 py-3 text-white">TOTAL</td>
                  <td className="px-4 py-3 text-white text-center">{analysis.totalDays}</td>
                  <td className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 text-white text-right">{analysis.totalGridImportKwh.toLocaleString()}</td>
                  <td className="px-4 py-3 text-cyan-400 text-right">{analysis.averageDailyKwh.toFixed(1)}</td>
                  <td className="px-4 py-3 text-white text-right">${analysis.totalCurrentCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-emerald-400 text-right">${analysis.totalPiCost.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right ${analysis.totalSavings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {analysis.totalSavings > 0 ? '+' : ''}${analysis.totalSavings.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Annualized Projection */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 rounded-xl p-6">
          <h3 className="text-cyan-400 font-semibold mb-2">Projected Annual Savings</h3>
          <p className="text-slate-400 text-sm mb-4">
            Based on {analysis.totalDays} days of data, projected to a full year:
          </p>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Projected Annual Usage</p>
              <p className="text-xl font-bold text-white">
                {annualizedUsage.toLocaleString()} kWh
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {analysis.averageDailyKwh.toFixed(1)} kWh/day × 365
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Projected Annual Bill (Current)</p>
              <p className="text-xl font-bold text-red-400">
                ${annualizedCurrentCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                @ {analysis.currentEffectiveRateCentsKwh.toFixed(1)}c effective rate
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm">Projected Annual Bill (Pi)</p>
              <p className="text-xl font-bold text-emerald-400">
                ${annualizedPiCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                @ {PI_RATE_CENTS_KWH}c flat, no supply charge
              </p>
            </div>
            <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
              <p className="text-emerald-400 text-sm">Projected Annual Savings</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${annualizedSavings.toFixed(2)}
              </p>
              <p className="text-xs text-emerald-400/70 mt-1">
                {analysis.savingsPercentage.toFixed(1)}% savings with Pi Energy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PiComparison;
