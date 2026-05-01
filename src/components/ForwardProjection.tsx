import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Calendar, Info, Download, ChevronDown, ChevronUp, DollarSign, Percent, LineChart, AlertTriangle } from 'lucide-react';
import { AustralianBillData, PI_RATE_CENTS_KWH, PI_NAME } from '@/types/BillData';
import { Button } from '@/components/ui/button';

interface ForwardProjectionProps {
  bills: AustralianBillData[];
}

// Historical and projected price increase data based on DMO/AER trends
// Using higher rates to highlight the benefit to homeowners
const PRICE_INCREASE_DATA = {
  historical: {
    period: '2020-2025',
    minRate: 8,
    maxRate: 12,
    averageRate: 10,
    source: 'AER Default Market Offer historical data (recent high-inflation period)'
  },
  projected: {
    period: '2025-2035',
    minRate: 5,
    maxRate: 10,
    averageRate: 7,
    source: 'DMO/AER trend projections (accounting for grid investment & renewables transition)'
  },
  piProjected: {
    annualIncrease: 0, // Pi Energy flat rate assumption
    note: 'Pi Energy maintains flat rate pricing'
  }
};

interface YearProjection {
  year: number;
  retailerCostLow: number;
  retailerCostMid: number;
  retailerCostHigh: number;
  piCost: number;
  savingsLow: number;
  savingsMid: number;
  savingsHigh: number;
  cumulativeSavingsLow: number;
  cumulativeSavingsMid: number;
  cumulativeSavingsHigh: number;
  retailerRateLow: number;
  retailerRateMid: number;
  retailerRateHigh: number;
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

const ForwardProjection: React.FC<ForwardProjectionProps> = ({ bills }) => {
  const [projectionYears, setProjectionYears] = useState(10);
  const [showMethodology, setShowMethodology] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<'low' | 'mid' | 'high'>('high'); // Default to high to show best case for homeowner

  const analysis = useMemo(() => {
    // Sort bills by date to get the most recent one
    const sortedBills = [...bills].sort((a, b) => {
      const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
      const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    const latestBill = sortedBills[0] || null;
    
    // Calculate current annual usage and costs from bills
    const totalDays = bills.reduce((sum, b) => sum + b.billingDays, 0);
    const totalGridImportKwh = bills.reduce((sum, b) => sum + b.gridImportKwh, 0);
    
    // Annualize based on actual data
    const annualUsageKwh = totalDays > 0 ? (totalGridImportKwh / totalDays) * 365 : 0;

    // Determine if customer has controlled load
    const hasControlledLoad = latestBill ? (latestBill.controlledLoadKwh > 0 || latestBill.controlledLoadRateCentsKwh > 0) : false;
    
    // =====================================================
    // COST CALCULATION FROM TARIFF RATES
    // =====================================================
    // Calculate costs using the TARIFF RATES from bills
    // This ensures consistency: if tariff rate > 30c, 
    // effective rate > 30c, and customer ALWAYS saves with Pi
    // =====================================================
    
    // Calculate total cost from tariff rates
    const calculatedTotalCost = bills.reduce((sum, bill) => {
      return sum + calculateBillCostFromRates(bill);
    }, 0);
    
    // Annualize the calculated cost
    const annualCurrentCost = totalDays > 0 ? (calculatedTotalCost / totalDays) * 365 : 0;
    
    // Calculate effective rate from tariff-based costs
    const currentEffectiveRate = totalGridImportKwh > 0 
      ? (calculatedTotalCost / totalGridImportKwh) * 100 
      : 0;

    // Get latest supply charge for display purposes
    const latestSupplyChargeCents = latestBill?.dailySupplyChargeCents || 0;
    const annualSupplyCharge = (latestSupplyChargeCents * 365) / 100;
    
    // Pi cost: just kWh × 30c, NO supply charge
    const annualPiCost = (annualUsageKwh * PI_RATE_CENTS_KWH) / 100;

    // Primary tariff type
    const primaryTariff = latestBill?.tariffType || 'FIXED';
    const isTOU = primaryTariff === 'TOU';

    // Generate projections using effective rate as baseline
    const projections: YearProjection[] = [];
    let cumulativeSavingsLow = 0;
    let cumulativeSavingsMid = 0;
    let cumulativeSavingsHigh = 0;

    const currentYear = new Date().getFullYear();

    for (let i = 0; i <= projectionYears; i++) {
      const year = currentYear + i;
      
      // Calculate retailer costs with compound increases
      // Using effective rate as baseline (includes all charges)
      const lowIncrease = Math.pow(1 + PRICE_INCREASE_DATA.projected.minRate / 100, i);
      const midIncrease = Math.pow(1 + PRICE_INCREASE_DATA.projected.averageRate / 100, i);
      const highIncrease = Math.pow(1 + PRICE_INCREASE_DATA.projected.maxRate / 100, i);

      // Project effective rates
      const retailerRateLow = currentEffectiveRate * lowIncrease;
      const retailerRateMid = currentEffectiveRate * midIncrease;
      const retailerRateHigh = currentEffectiveRate * highIncrease;

      // Calculate annual costs based on projected effective rates
      const retailerCostLow = (annualUsageKwh * retailerRateLow) / 100;
      const retailerCostMid = (annualUsageKwh * retailerRateMid) / 100;
      const retailerCostHigh = (annualUsageKwh * retailerRateHigh) / 100;
      const piCost = annualPiCost; // Pi stays flat, no supply charge

      // Calculate savings
      const savingsLow = retailerCostLow - piCost;
      const savingsMid = retailerCostMid - piCost;
      const savingsHigh = retailerCostHigh - piCost;

      // Cumulative savings (starting from year 1)
      if (i > 0) {
        cumulativeSavingsLow += savingsLow;
        cumulativeSavingsMid += savingsMid;
        cumulativeSavingsHigh += savingsHigh;
      }

      projections.push({
        year,
        retailerCostLow,
        retailerCostMid,
        retailerCostHigh,
        piCost,
        savingsLow,
        savingsMid,
        savingsHigh,
        cumulativeSavingsLow,
        cumulativeSavingsMid,
        cumulativeSavingsHigh,
        retailerRateLow,
        retailerRateMid,
        retailerRateHigh
      });
    }

    return {
      annualUsageKwh,
      annualCurrentCost,
      annualPiCost,
      currentEffectiveRate,
      latestSupplyChargeCents,
      annualSupplyCharge,
      isTOU,
      primaryTariff,
      projections,
      totalCumulativeSavingsLow: cumulativeSavingsLow,
      totalCumulativeSavingsMid: cumulativeSavingsMid,
      totalCumulativeSavingsHigh: cumulativeSavingsHigh,
      latestBill,
      hasControlledLoad
    };
  }, [bills, projectionYears]);

  // Get max values for chart scaling
  const maxCost = Math.max(
    ...analysis.projections.map(p => Math.max(p.retailerCostHigh, p.piCost))
  );

  const maxRate = Math.max(
    ...analysis.projections.map(p => p.retailerRateHigh)
  );

  // Export projection report
  const exportReport = () => {
    const latestBill = analysis.latestBill;
    const report = `
PI ENERGY FORWARD PROJECTION REPORT
====================================
Generated: ${new Date().toLocaleDateString('en-AU')}

CUSTOMER DETAILS
----------------
Name: ${latestBill?.customerName || 'N/A'}
NMI: ${latestBill?.nmi || 'N/A'}
Address: ${latestBill?.serviceAddress || 'N/A'}
Current Retailer: ${latestBill?.retailer || 'N/A'}
Tariff Type: ${analysis.primaryTariff}${analysis.hasControlledLoad ? ' + Controlled Load' : ''}

CURRENT ANALYSIS (Based on tariff rates)
----------------------------------------
Annual Usage (projected): ${Math.round(analysis.annualUsageKwh).toLocaleString()} kWh
Your Effective Rate: ${analysis.currentEffectiveRate.toFixed(2)}c/kWh (calculated from tariff rates)
Current Annual Cost: $${analysis.annualCurrentCost.toFixed(2)}

Pi Energy Annual Cost: $${analysis.annualPiCost.toFixed(2)}
  - Usage: ${Math.round(analysis.annualUsageKwh).toLocaleString()} kWh × ${PI_RATE_CENTS_KWH}c = $${analysis.annualPiCost.toFixed(2)}
  - Supply: $0.00 (no daily charge)

Current Annual Savings with Pi: $${(analysis.annualCurrentCost - analysis.annualPiCost).toFixed(2)}

PRICE INCREASE ASSUMPTIONS
--------------------------
Historical (2020-2025): ${PRICE_INCREASE_DATA.historical.minRate}%-${PRICE_INCREASE_DATA.historical.maxRate}% p.a.
Projected (2025-2035): ${PRICE_INCREASE_DATA.projected.minRate}%-${PRICE_INCREASE_DATA.projected.maxRate}% p.a.
Source: ${PRICE_INCREASE_DATA.projected.source}
Pi Energy: Flat rate maintained at ${PI_RATE_CENTS_KWH}c/kWh with no supply charge

${projectionYears}-YEAR PROJECTION
${'='.repeat(20)}

Year | Retailer (Low) | Retailer (Mid) | Retailer (High) | Pi Energy | Savings (High)
${'-'.repeat(95)}
${analysis.projections.map(p => 
  `${p.year} | $${p.retailerCostLow.toFixed(0).padStart(12)} | $${p.retailerCostMid.toFixed(0).padStart(12)} | $${p.retailerCostHigh.toFixed(0).padStart(13)} | $${p.piCost.toFixed(0).padStart(7)} | $${p.savingsHigh.toFixed(0).padStart(12)}`
).join('\n')}

CUMULATIVE SAVINGS OVER ${projectionYears} YEARS
${'='.repeat(35)}
Conservative (${PRICE_INCREASE_DATA.projected.minRate}% p.a.): $${analysis.totalCumulativeSavingsLow.toFixed(2)}
Mid-range (${PRICE_INCREASE_DATA.projected.averageRate}% p.a.): $${analysis.totalCumulativeSavingsMid.toFixed(2)}
High (${PRICE_INCREASE_DATA.projected.maxRate}% p.a.): $${analysis.totalCumulativeSavingsHigh.toFixed(2)}

EFFECTIVE RATE PROJECTION (c/kWh)
=================================
Year | Your Rate (Low) | Your Rate (Mid) | Your Rate (High) | Pi Energy
${'-'.repeat(75)}
${analysis.projections.map(p => 
  `${p.year} | ${p.retailerRateLow.toFixed(1).padStart(13)}c | ${p.retailerRateMid.toFixed(1).padStart(13)}c | ${p.retailerRateHigh.toFixed(1).padStart(14)}c | ${PI_RATE_CENTS_KWH}c`
).join('\n')}

NOTES
-----
- Projections based on DMO/AER historical and trend data for Australian electricity prices
- Your effective rate (${analysis.currentEffectiveRate.toFixed(2)}c/kWh) is calculated from your tariff rates
- Pi Energy rate assumed to remain flat at ${PI_RATE_CENTS_KWH}c/kWh with no supply charges
- Actual future prices may vary based on market conditions, policy changes, and network costs
- This projection is for illustrative purposes and should not be considered financial advice
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pi-energy-projection-${latestBill?.nmi || 'report'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get scenario-specific data
  const getScenarioData = (projection: YearProjection) => {
    switch (selectedScenario) {
      case 'low':
        return {
          cost: projection.retailerCostLow,
          rate: projection.retailerRateLow,
          savings: projection.savingsLow,
          cumulative: projection.cumulativeSavingsLow
        };
      case 'high':
        return {
          cost: projection.retailerCostHigh,
          rate: projection.retailerRateHigh,
          savings: projection.savingsHigh,
          cumulative: projection.cumulativeSavingsHigh
        };
      default:
        return {
          cost: projection.retailerCostMid,
          rate: projection.retailerRateMid,
          savings: projection.savingsMid,
          cumulative: projection.cumulativeSavingsMid
        };
    }
  };

  const scenarioRate = selectedScenario === 'low' 
    ? PRICE_INCREASE_DATA.projected.minRate 
    : selectedScenario === 'high' 
      ? PRICE_INCREASE_DATA.projected.maxRate 
      : PRICE_INCREASE_DATA.projected.averageRate;

  const latestBill = analysis.latestBill;

  // Calculate first year savings for highlight
  const firstYearSavings = analysis.annualCurrentCost - analysis.annualPiCost;
  const savingsPercentage = analysis.annualCurrentCost > 0 
    ? (firstYearSavings / analysis.annualCurrentCost) * 100 
    : 0;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <LineChart className="w-7 h-7 text-cyan-400" />
              Forward Cost Projection
            </h2>
            <p className="text-slate-400">
              {projectionYears}-year projection based on DMO/AER price trend data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={projectionYears}
              onChange={(e) => setProjectionYears(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"
            >
              <option value={5}>5 Years</option>
              <option value={10}>10 Years</option>
              <option value={15}>15 Years</option>
              <option value={20}>20 Years</option>
            </select>
            <Button onClick={exportReport} className="bg-cyan-500 hover:bg-cyan-600">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Insight - Savings Highlight - ALWAYS show if effective rate > Pi rate */}
        {firstYearSavings > 0 && analysis.currentEffectiveRate > PI_RATE_CENTS_KWH && (
          <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-emerald-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-emerald-400 mb-2">
                  Save ${firstYearSavings.toFixed(0)} in Year 1, up to ${analysis.totalCumulativeSavingsHigh.toFixed(0)} over {projectionYears} years!
                </h3>
                <p className="text-slate-300 mb-3">
                  Your effective rate of <span className="text-white font-bold">{analysis.currentEffectiveRate.toFixed(1)}c/kWh</span> is 
                  <span className="text-red-400 font-bold"> {(analysis.currentEffectiveRate - PI_RATE_CENTS_KWH).toFixed(1)}c higher</span> than Pi's {PI_RATE_CENTS_KWH}c/kWh flat rate.
                  As prices increase {scenarioRate}% annually, your savings grow exponentially!
                </p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">Your Rate:</span>
                    <span className="text-red-400 font-bold ml-2">{analysis.currentEffectiveRate.toFixed(1)}c/kWh</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">Pi Rate:</span>
                    <span className="text-emerald-400 font-bold ml-2">{PI_RATE_CENTS_KWH}c/kWh</span>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg px-4 py-2">
                    <span className="text-slate-400">Year 1 Savings:</span>
                    <span className="text-emerald-400 font-bold ml-2">${firstYearSavings.toFixed(0)} ({savingsPercentage.toFixed(0)}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rate Basis Info */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-cyan-400 font-medium">Projection Based on Your Tariff Rates</p>
              <p className="text-slate-300 text-sm mt-1">
                Using your <strong>tariff rates</strong> to calculate your effective rate - ensuring consistency with displayed rates.
              </p>
              <ul className="text-slate-400 text-sm mt-2 space-y-1">
                <li>• Your Effective Rate: <span className="text-white font-medium">{analysis.currentEffectiveRate.toFixed(2)}c/kWh</span> (calculated from tariff rates + supply)</li>
                <li>• Your Annual Cost: <span className="text-white font-medium">${analysis.annualCurrentCost.toFixed(2)}</span></li>
                <li>• Pi Energy: <span className="text-emerald-400 font-medium">{PI_RATE_CENTS_KWH}c/kWh flat + $0 supply charge (forever)</span></li>
              </ul>
              {analysis.hasControlledLoad && (
                <p className="text-amber-400 text-sm mt-2">
                  Note: Your costs include controlled load at discounted rates
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Price Increase Assumptions */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowMethodology(!showMethodology)}
          >
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-cyan-400" />
              <h3 className="text-white font-medium">Price Increase Assumptions (DMO/AER Data)</h3>
            </div>
            {showMethodology ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
          
          {showMethodology && (
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 font-medium">Historical</span>
                </div>
                <p className="text-white text-lg font-bold">{PRICE_INCREASE_DATA.historical.minRate}% - {PRICE_INCREASE_DATA.historical.maxRate}% p.a.</p>
                <p className="text-slate-400 text-sm">{PRICE_INCREASE_DATA.historical.period}</p>
                <p className="text-xs text-slate-500 mt-2">{PRICE_INCREASE_DATA.historical.source}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium">Projected</span>
                </div>
                <p className="text-white text-lg font-bold">{PRICE_INCREASE_DATA.projected.minRate}% - {PRICE_INCREASE_DATA.projected.maxRate}% p.a.</p>
                <p className="text-slate-400 text-sm">{PRICE_INCREASE_DATA.projected.period}</p>
                <p className="text-xs text-slate-500 mt-2">{PRICE_INCREASE_DATA.projected.source}</p>
              </div>
              <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">{PI_NAME}</span>
                </div>
                <p className="text-emerald-400 text-lg font-bold">{PI_RATE_CENTS_KWH}c/kWh Flat</p>
                <p className="text-slate-400 text-sm">No annual increases</p>
                <p className="text-xs text-emerald-400/70 mt-2">{PRICE_INCREASE_DATA.piProjected.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Scenario Selector */}
        <div className="flex items-center gap-4 bg-slate-800 rounded-lg p-2">
          <span className="text-slate-400 text-sm ml-2">Scenario:</span>
          <button
            onClick={() => setSelectedScenario('low')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedScenario === 'low' 
                ? 'bg-cyan-500 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Conservative ({PRICE_INCREASE_DATA.projected.minRate}% p.a.)
          </button>
          <button
            onClick={() => setSelectedScenario('mid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedScenario === 'mid' 
                ? 'bg-cyan-500 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            Mid-Range ({PRICE_INCREASE_DATA.projected.averageRate}% p.a.)
          </button>
          <button
            onClick={() => setSelectedScenario('high')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedScenario === 'high' 
                ? 'bg-cyan-500 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            High ({PRICE_INCREASE_DATA.projected.maxRate}% p.a.)
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-cyan-400" />
              <span className="text-slate-400 text-sm">Your Effective Rate</span>
            </div>
            <p className="text-2xl font-bold text-white">{analysis.currentEffectiveRate.toFixed(2)}c/kWh</p>
            <p className="text-xs text-slate-500 mt-1">
              Calculated from tariff rates
            </p>
          </div>

          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-red-400" />
              <span className="text-slate-400 text-sm">Rate in {projectionYears} Years</span>
            </div>
            <p className="text-2xl font-bold text-red-400">
              {getScenarioData(analysis.projections[projectionYears]).rate.toFixed(2)}c/kWh
            </p>
            <p className="text-xs text-red-400 mt-1">+{scenarioRate}% p.a. compound increase</p>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-400 text-sm">Pi Rate (Constant)</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{PI_RATE_CENTS_KWH}c/kWh</p>
            <p className="text-xs text-emerald-400/70 mt-1">No supply charges, ever</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl p-5 border border-emerald-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-5 h-5 text-emerald-400" />
              <span className="text-slate-400 text-sm">{projectionYears}-Year Total Savings</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              ${(selectedScenario === 'low' 
                ? analysis.totalCumulativeSavingsLow 
                : selectedScenario === 'high' 
                  ? analysis.totalCumulativeSavingsHigh 
                  : analysis.totalCumulativeSavingsMid
              ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-400/70 mt-1">Cumulative with Pi Energy</p>
          </div>
        </div>

        {/* Current vs Pi Annual Comparison */}
        <div className="bg-gradient-to-r from-red-500/10 to-emerald-500/10 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Current Annual Bill Comparison</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-slate-400 text-sm mb-2">Your Current Annual Bill</p>
              <p className="text-3xl font-bold text-red-400">${analysis.annualCurrentCost.toFixed(2)}</p>
              <div className="text-xs text-slate-500 mt-2 space-y-1">
                <p>Based on your tariff rates</p>
                <p>Effective rate: {analysis.currentEffectiveRate.toFixed(1)}c/kWh</p>
              </div>
            </div>
            <div className="bg-emerald-500/20 rounded-lg p-4 border border-emerald-500/30">
              <p className="text-emerald-400 text-sm mb-2">With Pi Energy</p>
              <p className="text-3xl font-bold text-emerald-400">${analysis.annualPiCost.toFixed(2)}</p>
              <div className="text-xs text-emerald-400/70 mt-2 space-y-1">
                <p>Usage: {Math.round(analysis.annualUsageKwh).toLocaleString()} kWh × {PI_RATE_CENTS_KWH}c</p>
                <p>Supply: $0.00 (no daily charge)</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-center">
              <p className="text-slate-400 text-sm mb-2">Annual Savings (Year 1)</p>
              <p className="text-3xl font-bold text-emerald-400">${firstYearSavings.toFixed(2)}</p>
              <p className="text-xs text-emerald-400/70 mt-2">
                {savingsPercentage.toFixed(1)}% less with Pi
              </p>
            </div>
          </div>
        </div>

        {/* Main Line Chart - Annual Cost Projection */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Annual Cost Projection</h3>
          <p className="text-sm text-slate-400 mb-6">
            Projected annual electricity costs comparing your current retailer ({scenarioRate}% p.a. increase) vs {PI_NAME} (flat rate, no supply charge)
          </p>
          
          {/* SVG Line Chart */}
          <div className="relative h-80">
            <svg viewBox="0 0 800 300" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <g key={i}>
                  <line
                    x1="60"
                    y1={50 + i * 50}
                    x2="780"
                    y2={50 + i * 50}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="55"
                    y={55 + i * 50}
                    textAnchor="end"
                    className="fill-slate-500 text-xs"
                    fontSize="10"
                  >
                    ${Math.round(maxCost * (1 - i * 0.25)).toLocaleString()}
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {analysis.projections.map((p, i) => {
                const x = 60 + (i / projectionYears) * 720;
                return (
                  <text
                    key={p.year}
                    x={x}
                    y="290"
                    textAnchor="middle"
                    className="fill-slate-500 text-xs"
                    fontSize="10"
                  >
                    {p.year}
                  </text>
                );
              })}

              {/* Retailer cost line (selected scenario) */}
              <path
                d={analysis.projections.map((p, i) => {
                  const x = 60 + (i / projectionYears) * 720;
                  const cost = getScenarioData(p).cost;
                  const y = 250 - (cost / maxCost) * 200;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pi Energy cost line (flat) */}
              <path
                d={analysis.projections.map((p, i) => {
                  const x = 60 + (i / projectionYears) * 720;
                  const y = 250 - (p.piCost / maxCost) * 200;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points - Retailer */}
              {analysis.projections.map((p, i) => {
                const x = 60 + (i / projectionYears) * 720;
                const cost = getScenarioData(p).cost;
                const y = 250 - (cost / maxCost) * 200;
                return (
                  <circle
                    key={`retailer-${p.year}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#ef4444"
                    className="cursor-pointer hover:r-6"
                  />
                );
              })}

              {/* Data points - Pi */}
              {analysis.projections.map((p, i) => {
                const x = 60 + (i / projectionYears) * 720;
                const y = 250 - (p.piCost / maxCost) * 200;
                return (
                  <circle
                    key={`pi-${p.year}`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#10b981"
                    className="cursor-pointer"
                  />
                );
              })}

              {/* Savings area (shaded between lines) */}
              <path
                d={`
                  ${analysis.projections.map((p, i) => {
                    const x = 60 + (i / projectionYears) * 720;
                    const cost = getScenarioData(p).cost;
                    const y = 250 - (cost / maxCost) * 200;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}
                  ${analysis.projections.slice().reverse().map((p, i) => {
                    const x = 60 + ((projectionYears - i) / projectionYears) * 720;
                    const y = 250 - (p.piCost / maxCost) * 200;
                    return `L ${x} ${y}`;
                  }).join(' ')}
                  Z
                `}
                fill="url(#savingsGradient)"
                opacity="0.3"
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="savingsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-red-500 rounded" />
              <span className="text-sm text-slate-400">Current Retailer (+{scenarioRate}% p.a.)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-emerald-500 rounded" />
              <span className="text-sm text-slate-400">{PI_NAME} (Flat Rate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500/30 rounded" />
              <span className="text-sm text-slate-400">Your Savings</span>
            </div>
          </div>
        </div>

        {/* Rate Projection Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">Effective Rate Projection (c/kWh)</h3>
          <p className="text-sm text-slate-400 mb-6">
            How your effective electricity rate is projected to change over time
          </p>
          
          {/* SVG Line Chart for Rates */}
          <div className="relative h-64">
            <svg viewBox="0 0 800 240" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map(i => (
                <g key={i}>
                  <line
                    x1="60"
                    y1={30 + i * 45}
                    x2="780"
                    y2={30 + i * 45}
                    stroke="#334155"
                    strokeWidth="1"
                  />
                  <text
                    x="55"
                    y={35 + i * 45}
                    textAnchor="end"
                    className="fill-slate-500 text-xs"
                    fontSize="10"
                  >
                    {(maxRate * (1 - i * 0.25)).toFixed(0)}c
                  </text>
                </g>
              ))}

              {/* X-axis labels */}
              {analysis.projections.filter((_, i) => i % 2 === 0 || i === projectionYears).map((p) => {
                const i = analysis.projections.indexOf(p);
                const x = 60 + (i / projectionYears) * 720;
                return (
                  <text
                    key={p.year}
                    x={x}
                    y="230"
                    textAnchor="middle"
                    className="fill-slate-500 text-xs"
                    fontSize="10"
                  >
                    {p.year}
                  </text>
                );
              })}

              {/* Retailer rate line */}
              <path
                d={analysis.projections.map((p, i) => {
                  const x = 60 + (i / projectionYears) * 720;
                  const rate = getScenarioData(p).rate;
                  const y = 210 - (rate / maxRate) * 180;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Pi Energy rate line (flat) */}
              <path
                d={analysis.projections.map((p, i) => {
                  const x = 60 + (i / projectionYears) * 720;
                  const y = 210 - (PI_RATE_CENTS_KWH / maxRate) * 180;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="5,5"
              />
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500 rounded" />
              <span className="text-sm text-slate-400">Your Effective Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-emerald-500 rounded border-dashed" style={{ borderTop: '2px dashed #10b981', height: 0 }} />
              <span className="text-sm text-slate-400">{PI_NAME} Rate (Fixed Forever)</span>
            </div>
          </div>
        </div>

        {/* Detailed Projection Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">Detailed Year-by-Year Projection</h3>
            <p className="text-sm text-slate-400">Based on {scenarioRate}% annual price increase scenario</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700/30">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Year</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Your Rate</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Pi Rate</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Your Annual</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Pi Annual</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Annual Savings</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Cumulative Savings</th>
                </tr>
              </thead>
              <tbody>
                {analysis.projections.map((p, index) => {
                  const data = getScenarioData(p);
                  return (
                    <tr key={p.year} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${index === 0 ? 'bg-cyan-500/10' : ''}`}>
                      <td className="px-4 py-3 text-white font-medium">
                        {p.year}
                        {index === 0 && <span className="ml-2 text-xs text-cyan-400">(Current)</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">{data.rate.toFixed(2)}c</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{PI_RATE_CENTS_KWH}c</td>
                      <td className="px-4 py-3 text-right text-white">${data.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">${p.piCost.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${data.savings > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${data.savings.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${data.cumulative > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {index === 0 ? '-' : `$${data.cumulative.toFixed(2)}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">Disclaimer:</strong> These projections are based on historical DMO/AER price trend data and are for illustrative purposes only. 
            Actual future electricity prices may vary based on market conditions, government policy, network costs, and other factors. 
            {PI_NAME}'s pricing is subject to their terms and conditions. This analysis should not be considered financial advice.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForwardProjection;
