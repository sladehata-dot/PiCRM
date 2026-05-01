// PDF Export Utility for Pi Energy Analysis Reports
import { AustralianBillData, PI_RATE_CENTS_KWH, PI_NAME, getBillingCycleDisplay, calculateEffectiveRate, type BillingCycle as BillingCycleType } from '@/types/BillData';

// Price increase data based on DMO/AER trends
const PRICE_INCREASE_DATA = {
  historical: {
    period: '2020-2025',
    minRate: 6,
    maxRate: 8,
    averageRate: 7,
    source: 'AER Default Market Offer historical data'
  },
  projected: {
    period: '2025-2035',
    minRate: 4,
    maxRate: 6,
    averageRate: 5,
    source: 'DMO/AER trend projections'
  }
};

interface CustomerProfileData {
  customerName: string;
  nmi: string;
  serviceAddress: string;
  accountNumber: string;
  retailer: string;
  powerPhases: 1 | 2 | 3;
  hasSolar: boolean;
  solarSystemSize: number | null;
  primaryTariff: string;
  billingCycle: BillingCycleType;
  avgFixedRate: number;
  avgSupplyCharge: number;
  avgFeedInTariff: number;
}

interface BillCoverageData {
  totalDays: number;
  billCount: number;
  startDate: string;
  endDate: string;
  coveragePercentage: number;
  periods: Array<{
    start: string;
    end: string;
    days: number;
    cycle: BillingCycleType;
  }>;
}

interface SavingsAnalysisData {
  totalCurrentCost: number;
  totalPiCost: number;
  totalSavings: number;
  savingsPercentage: number;
  totalGridImportKwh: number;
  averageDailyKwh: number;
  currentAverageRate: number;
  currentEffectiveRate: number;
  periodBreakdown: Array<{
    period: string;
    days: number;
    usageKwh: number;
    currentCost: number;
    piCost: number;
    savings: number;
  }>;
}

interface ForwardProjectionData {
  baseRate: number;
  annualUsageKwh: number;
  projectionYears: number;
  scenario: 'low' | 'mid' | 'high';
  scenarioRate: number;
  projections: Array<{
    year: number;
    retailerRate: number;
    retailerCost: number;
    piCost: number;
    savings: number;
    cumulativeSavings: number;
  }>;
  totalCumulativeSavings: number;
}

export interface PDFReportData {
  generatedDate: string;
  customerProfile: CustomerProfileData;
  billCoverage: BillCoverageData;
  savingsAnalysis: SavingsAnalysisData;
  forwardProjection: ForwardProjectionData;
}

// Extract customer profile from bills
function extractCustomerProfile(bills: AustralianBillData[]): CustomerProfileData {
  const latestBill = bills[0];
  const hasSolar = bills.some(bill => bill.hasSolar);
  const solarSize = bills.find(bill => bill.solarSystemSize)?.solarSystemSize || null;

  const tariffCounts = bills.reduce((acc, bill) => {
    acc[bill.tariffType] = (acc[bill.tariffType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const primaryTariff = Object.entries(tariffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'FIXED';

  const cycleCounts = bills.reduce((acc, bill) => {
    acc[bill.billingCycle] = (acc[bill.billingCycle] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const billingCycle = Object.entries(cycleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as BillingCycleType || 'MONTHLY';

  const avgFixedRate = bills.reduce((sum, b) => sum + b.singleRateCentsKwh, 0) / bills.length;
  const avgSupplyCharge = bills.reduce((sum, b) => sum + b.dailySupplyChargeCents, 0) / bills.length;
  const solarBills = bills.filter(b => b.feedInTariffCentsKwh > 0);
  const avgFeedInTariff = solarBills.length > 0 
    ? solarBills.reduce((sum, b) => sum + b.feedInTariffCentsKwh, 0) / solarBills.length 
    : 0;

  return {
    customerName: latestBill.customerName,
    nmi: latestBill.nmi,
    serviceAddress: latestBill.serviceAddress,
    accountNumber: latestBill.accountNumber,
    retailer: latestBill.retailer,
    powerPhases: latestBill.powerPhases,
    hasSolar,
    solarSystemSize: solarSize,
    primaryTariff,
    billingCycle,
    avgFixedRate,
    avgSupplyCharge,
    avgFeedInTariff
  };
}

// Extract bill coverage data
function extractBillCoverage(bills: AustralianBillData[]): BillCoverageData {
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = new Date(a.billingPeriodStart.split('/').reverse().join('-'));
    const dateB = new Date(b.billingPeriodStart.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });

  const totalDays = bills.reduce((sum, b) => sum + b.billingDays, 0);
  const coveragePercentage = Math.min((totalDays / 365) * 100, 100);

  const periods = sortedBills.map(bill => ({
    start: bill.billingPeriodStart,
    end: bill.billingPeriodEnd,
    days: bill.billingDays,
    cycle: bill.billingCycle
  }));

  return {
    totalDays,
    billCount: bills.length,
    startDate: sortedBills[0]?.billingPeriodStart || '',
    endDate: sortedBills[sortedBills.length - 1]?.billingPeriodEnd || '',
    coveragePercentage,
    periods
  };
}

// Extract savings analysis data
function extractSavingsAnalysis(bills: AustralianBillData[]): SavingsAnalysisData {
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
    const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });

  const totalDays = bills.reduce((sum, b) => sum + b.billingDays, 0);
  const totalGridImportKwh = bills.reduce((sum, b) => sum + b.gridImportKwh, 0);
  const totalCurrentCost = bills.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalPiCost = (totalGridImportKwh * PI_RATE_CENTS_KWH) / 100;
  const totalSavings = totalCurrentCost - totalPiCost;
  const savingsPercentage = totalCurrentCost > 0 ? (totalSavings / totalCurrentCost) * 100 : 0;
  const averageDailyKwh = totalDays > 0 ? totalGridImportKwh / totalDays : 0;

  // Calculate average rates
  const currentAverageRate = bills.reduce((sum, b) => {
    if (b.tariffType === 'FIXED') return sum + b.singleRateCentsKwh;
    const totalUsage = b.peakUsageKwh + b.offPeakUsageKwh + b.shoulderUsageKwh + b.controlledLoadKwh;
    if (totalUsage === 0) return sum;
    const weightedRate = (
      (b.peakUsageKwh * b.peakRateCentsKwh) +
      (b.offPeakUsageKwh * b.offPeakRateCentsKwh) +
      (b.shoulderUsageKwh * b.shoulderRateCentsKwh) +
      (b.controlledLoadKwh * b.controlledLoadRateCentsKwh)
    ) / totalUsage;
    return sum + weightedRate;
  }, 0) / (bills.length || 1);

  const currentEffectiveRate = bills.reduce((sum, b) => sum + calculateEffectiveRate(b), 0) / (bills.length || 1);

  const periodBreakdown = sortedBills.map(bill => {
    const piCost = (bill.gridImportKwh * PI_RATE_CENTS_KWH) / 100;
    return {
      period: `${bill.billingPeriodStart} - ${bill.billingPeriodEnd}`,
      days: bill.billingDays,
      usageKwh: bill.gridImportKwh,
      currentCost: bill.totalAmount,
      piCost,
      savings: bill.totalAmount - piCost
    };
  });

  return {
    totalCurrentCost,
    totalPiCost,
    totalSavings,
    savingsPercentage,
    totalGridImportKwh,
    averageDailyKwh,
    currentAverageRate,
    currentEffectiveRate,
    periodBreakdown
  };
}

// Generate forward projection data
function generateForwardProjection(
  bills: AustralianBillData[], 
  projectionYears: number = 10,
  scenario: 'low' | 'mid' | 'high' = 'mid'
): ForwardProjectionData {
  const totalDays = bills.reduce((sum, b) => sum + b.billingDays, 0);
  const totalGridImportKwh = bills.reduce((sum, b) => sum + b.gridImportKwh, 0);
  const totalCurrentCost = bills.reduce((sum, b) => sum + b.totalAmount, 0);

  const annualUsageKwh = totalDays > 0 ? (totalGridImportKwh / totalDays) * 365 : 0;
  const annualPiCost = (annualUsageKwh * PI_RATE_CENTS_KWH) / 100;

  // Calculate base rate
  const avgEffectiveRate = bills.reduce((sum, b) => sum + calculateEffectiveRate(b), 0) / (bills.length || 1);
  const baseRate = avgEffectiveRate > 0 ? avgEffectiveRate : 30;

  const scenarioRate = scenario === 'low' 
    ? PRICE_INCREASE_DATA.projected.minRate 
    : scenario === 'high' 
      ? PRICE_INCREASE_DATA.projected.maxRate 
      : PRICE_INCREASE_DATA.projected.averageRate;

  const currentYear = new Date().getFullYear();
  const projections: ForwardProjectionData['projections'] = [];
  let cumulativeSavings = 0;

  for (let i = 0; i <= projectionYears; i++) {
    const year = currentYear + i;
    const increase = Math.pow(1 + scenarioRate / 100, i);
    const retailerRate = baseRate * increase;
    const retailerCost = (annualUsageKwh * retailerRate) / 100;
    const savings = retailerCost - annualPiCost;

    if (i > 0) {
      cumulativeSavings += savings;
    }

    projections.push({
      year,
      retailerRate,
      retailerCost,
      piCost: annualPiCost,
      savings,
      cumulativeSavings
    });
  }

  return {
    baseRate,
    annualUsageKwh,
    projectionYears,
    scenario,
    scenarioRate,
    projections,
    totalCumulativeSavings: cumulativeSavings
  };
}

// Compile all report data
export function compileReportData(
  bills: AustralianBillData[],
  projectionYears: number = 10,
  scenario: 'low' | 'mid' | 'high' = 'mid'
): PDFReportData {
  return {
    generatedDate: new Date().toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    customerProfile: extractCustomerProfile(bills),
    billCoverage: extractBillCoverage(bills),
    savingsAnalysis: extractSavingsAnalysis(bills),
    forwardProjection: generateForwardProjection(bills, projectionYears, scenario)
  };
}

// Generate HTML report for PDF export
export function generatePDFHTML(data: PDFReportData): string {
  const { customerProfile, billCoverage, savingsAnalysis, forwardProjection } = data;

  // Generate SVG chart for cost comparison
  const maxCost = Math.max(...savingsAnalysis.periodBreakdown.map(p => Math.max(p.currentCost, p.piCost)));
  const chartWidth = 600;
  const chartHeight = 200;
  const barWidth = Math.min(40, (chartWidth - 100) / (savingsAnalysis.periodBreakdown.length * 2 + 1));

  const costComparisonSVG = `
    <svg viewBox="0 0 ${chartWidth} ${chartHeight + 50}" style="width: 100%; max-width: 600px; height: auto;">
      <!-- Grid lines -->
      ${[0, 1, 2, 3, 4].map(i => `
        <line x1="50" y1="${20 + i * 45}" x2="${chartWidth - 20}" y2="${20 + i * 45}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="45" y="${25 + i * 45}" text-anchor="end" font-size="10" fill="#64748b">$${Math.round(maxCost * (1 - i * 0.25))}</text>
      `).join('')}
      
      <!-- Bars -->
      ${savingsAnalysis.periodBreakdown.map((p, i) => {
        const x = 60 + i * (barWidth * 2 + 15);
        const currentHeight = (p.currentCost / maxCost) * 180;
        const piHeight = (p.piCost / maxCost) * 180;
        return `
          <rect x="${x}" y="${200 - currentHeight}" width="${barWidth}" height="${currentHeight}" fill="#ef4444" rx="2"/>
          <rect x="${x + barWidth + 2}" y="${200 - piHeight}" width="${barWidth}" height="${piHeight}" fill="#10b981" rx="2"/>
          <text x="${x + barWidth}" y="${chartHeight + 15}" text-anchor="middle" font-size="8" fill="#64748b">${p.period.split(' - ')[1].split('/').slice(0, 2).join('/')}</text>
        `;
      }).join('')}
      
      <!-- Legend -->
      <rect x="${chartWidth - 150}" y="${chartHeight + 25}" width="12" height="12" fill="#ef4444" rx="2"/>
      <text x="${chartWidth - 135}" y="${chartHeight + 35}" font-size="10" fill="#374151">Current Retailer</text>
      <rect x="${chartWidth - 70}" y="${chartHeight + 25}" width="12" height="12" fill="#10b981" rx="2"/>
      <text x="${chartWidth - 55}" y="${chartHeight + 35}" font-size="10" fill="#374151">Pi Energy</text>
    </svg>
  `;

  // Generate SVG chart for forward projection
  const maxProjectedCost = Math.max(...forwardProjection.projections.map(p => p.retailerCost));
  const projectionSVG = `
    <svg viewBox="0 0 700 280" style="width: 100%; max-width: 700px; height: auto;">
      <!-- Grid lines -->
      ${[0, 1, 2, 3, 4].map(i => `
        <line x1="60" y1="${30 + i * 50}" x2="680" y2="${30 + i * 50}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="55" y="${35 + i * 50}" text-anchor="end" font-size="10" fill="#64748b">$${Math.round(maxProjectedCost * (1 - i * 0.25)).toLocaleString()}</text>
      `).join('')}
      
      <!-- Retailer line -->
      <path d="${forwardProjection.projections.map((p, i) => {
        const x = 60 + (i / forwardProjection.projectionYears) * 620;
        const y = 230 - (p.retailerCost / maxProjectedCost) * 200;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
      
      <!-- Pi line -->
      <path d="${forwardProjection.projections.map((p, i) => {
        const x = 60 + (i / forwardProjection.projectionYears) * 620;
        const y = 230 - (p.piCost / maxProjectedCost) * 200;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ')}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
      
      <!-- Data points -->
      ${forwardProjection.projections.map((p, i) => {
        const x = 60 + (i / forwardProjection.projectionYears) * 620;
        const yRetailer = 230 - (p.retailerCost / maxProjectedCost) * 200;
        const yPi = 230 - (p.piCost / maxProjectedCost) * 200;
        return `
          <circle cx="${x}" cy="${yRetailer}" r="4" fill="#ef4444"/>
          <circle cx="${x}" cy="${yPi}" r="4" fill="#10b981"/>
        `;
      }).join('')}
      
      <!-- X-axis labels -->
      ${forwardProjection.projections.filter((_, i) => i % 2 === 0 || i === forwardProjection.projectionYears).map((p, idx) => {
        const i = forwardProjection.projections.indexOf(p);
        const x = 60 + (i / forwardProjection.projectionYears) * 620;
        return `<text x="${x}" y="255" text-anchor="middle" font-size="10" fill="#64748b">${p.year}</text>`;
      }).join('')}
      
      <!-- Legend -->
      <line x1="200" y1="270" x2="230" y2="270" stroke="#ef4444" stroke-width="2.5"/>
      <text x="235" y="274" font-size="10" fill="#374151">Retailer (+${forwardProjection.scenarioRate}% p.a.)</text>
      <line x1="400" y1="270" x2="430" y2="270" stroke="#10b981" stroke-width="2.5"/>
      <text x="435" y="274" font-size="10" fill="#374151">${PI_NAME} (Flat Rate)</text>
    </svg>
  `;

  // Generate bill coverage timeline SVG
  const timelineSVG = `
    <svg viewBox="0 0 600 60" style="width: 100%; max-width: 600px; height: auto;">
      <!-- Timeline bar -->
      <rect x="50" y="20" width="500" height="20" fill="#e2e8f0" rx="4"/>
      <rect x="50" y="20" width="${Math.min(billCoverage.coveragePercentage, 100) * 5}" height="20" fill="#10b981" rx="4"/>
      
      <!-- Labels -->
      <text x="50" y="55" font-size="10" fill="#64748b">${billCoverage.startDate}</text>
      <text x="550" y="55" text-anchor="end" font-size="10" fill="#64748b">${billCoverage.endDate}</text>
      <text x="300" y="15" text-anchor="middle" font-size="11" fill="#374151" font-weight="600">${billCoverage.totalDays} days covered (${billCoverage.coveragePercentage.toFixed(1)}%)</text>
    </svg>
  `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pi Energy Analysis Report - ${customerProfile.customerName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1f2937;
      background: white;
      padding: 20px;
    }
    
    .page {
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 3px solid #10b981;
      margin-bottom: 25px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 18px;
    }
    
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #10b981;
    }
    
    .report-title {
      text-align: right;
    }
    
    .report-title h1 {
      font-size: 18px;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .report-title p {
      font-size: 10px;
      color: #6b7280;
    }
    
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .section-header {
      background: linear-gradient(90deg, #f0fdf4, #ecfeff);
      padding: 10px 15px;
      border-left: 4px solid #10b981;
      margin-bottom: 15px;
    }
    
    .section-header h2 {
      font-size: 14px;
      color: #047857;
      margin: 0;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
    }
    
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 10px;
    }
    
    .info-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
    }
    
    .info-card.highlight {
      background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
      border-color: #10b981;
    }
    
    .info-card.savings {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
    }
    
    .info-card label {
      display: block;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 4px;
    }
    
    .info-card.savings label {
      color: rgba(255,255,255,0.8);
    }
    
    .info-card .value {
      font-size: 16px;
      font-weight: 700;
      color: #1f2937;
    }
    
    .info-card.savings .value {
      color: white;
      font-size: 20px;
    }
    
    .info-card .sub {
      font-size: 9px;
      color: #9ca3af;
      margin-top: 2px;
    }
    
    .info-card.savings .sub {
      color: rgba(255,255,255,0.7);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    
    th, td {
      padding: 8px 10px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
    }
    
    tr:nth-child(even) {
      background: #f9fafb;
    }
    
    .text-right {
      text-align: right;
    }
    
    .text-center {
      text-align: center;
    }
    
    .text-green {
      color: #10b981;
    }
    
    .text-red {
      color: #ef4444;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 9px;
      font-weight: 500;
    }
    
    .badge-green {
      background: #d1fae5;
      color: #047857;
    }
    
    .badge-blue {
      background: #dbeafe;
      color: #1d4ed8;
    }
    
    .chart-container {
      display: flex;
      justify-content: center;
      margin: 15px 0;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      text-align: center;
    }
    
    .summary-box {
      background: linear-gradient(135deg, #ecfdf5, #f0fdfa);
      border: 2px solid #10b981;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      margin: 20px 0;
    }
    
    .summary-box h3 {
      font-size: 12px;
      color: #047857;
      margin-bottom: 10px;
    }
    
    .summary-box .big-number {
      font-size: 36px;
      font-weight: 800;
      color: #10b981;
    }
    
    .summary-box .description {
      font-size: 11px;
      color: #6b7280;
      margin-top: 5px;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    @media print {
      body {
        padding: 0;
      }
      .page {
        max-width: none;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <div class="logo-icon">π</div>
        <span class="logo-text">Pi Energy</span>
      </div>
      <div class="report-title">
        <h1>Energy Analysis Report</h1>
        <p>Generated: ${data.generatedDate}</p>
      </div>
    </div>
    
    <!-- Customer Profile Section -->
    <div class="section">
      <div class="section-header">
        <h2>Customer Profile Summary</h2>
      </div>
      <div class="grid-2">
        <div class="info-card">
          <label>Customer Name</label>
          <div class="value">${customerProfile.customerName}</div>
        </div>
        <div class="info-card">
          <label>NMI (National Meter Identifier)</label>
          <div class="value" style="font-family: monospace;">${customerProfile.nmi}</div>
        </div>
        <div class="info-card">
          <label>Service Address</label>
          <div class="value" style="font-size: 12px;">${customerProfile.serviceAddress}</div>
        </div>
        <div class="info-card">
          <label>Current Retailer</label>
          <div class="value">${customerProfile.retailer}</div>
        </div>
      </div>
      
      <div class="grid-4" style="margin-top: 15px;">
        <div class="info-card">
          <label>Power Supply</label>
          <div class="value">${customerProfile.powerPhases === 1 ? 'Single Phase' : customerProfile.powerPhases === 3 ? 'Three Phase' : 'Two Phase'}</div>
        </div>
        <div class="info-card">
          <label>Solar System</label>
          <div class="value">${customerProfile.hasSolar ? (customerProfile.solarSystemSize ? `${customerProfile.solarSystemSize} kW` : 'Yes') : 'No'}</div>
        </div>
        <div class="info-card">
          <label>Tariff Type</label>
          <div class="value">${customerProfile.primaryTariff === 'TOU' ? 'Time of Use' : customerProfile.primaryTariff === 'DEMAND' ? 'Demand' : 'Flat Rate'}</div>
        </div>
        <div class="info-card">
          <label>Billing Cycle</label>
          <div class="value">${getBillingCycleDisplay(customerProfile.billingCycle)}</div>
        </div>
      </div>
    </div>
    
    <!-- Bill Coverage Timeline -->
    <div class="section">
      <div class="section-header">
        <h2>Bill Coverage Timeline</h2>
      </div>
      <div class="chart-container">
        ${timelineSVG}
      </div>
      <div class="grid-3">
        <div class="info-card">
          <label>Bills Analyzed</label>
          <div class="value">${billCoverage.billCount}</div>
        </div>
        <div class="info-card">
          <label>Total Days Covered</label>
          <div class="value">${billCoverage.totalDays} days</div>
        </div>
        <div class="info-card highlight">
          <label>Coverage</label>
          <div class="value">${billCoverage.coveragePercentage.toFixed(1)}%</div>
          <div class="sub">${billCoverage.coveragePercentage >= 100 ? 'Full year' : `${Math.round(365 - billCoverage.totalDays)} days to full year`}</div>
        </div>
      </div>
      
      <table style="margin-top: 15px;">
        <thead>
          <tr>
            <th>Billing Period</th>
            <th class="text-center">Days</th>
            <th class="text-center">Cycle Type</th>
          </tr>
        </thead>
        <tbody>
          ${billCoverage.periods.map(p => `
            <tr>
              <td>${p.start} - ${p.end}</td>
              <td class="text-center">${p.days}</td>
              <td class="text-center"><span class="badge badge-blue">${getBillingCycleDisplay(p.cycle)}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Rate Comparison -->
    <div class="section">
      <div class="section-header">
        <h2>Rate Comparison Analysis</h2>
      </div>
      <div class="grid-3">
        <div class="info-card">
          <label>Your Average Rate</label>
          <div class="value">${savingsAnalysis.currentAverageRate.toFixed(2)}c/kWh</div>
          <div class="sub">Usage charges only</div>
        </div>
        <div class="info-card">
          <label>Your Effective Rate</label>
          <div class="value">${savingsAnalysis.currentEffectiveRate.toFixed(2)}c/kWh</div>
          <div class="sub">Including supply charges</div>
        </div>
        <div class="info-card highlight">
          <label>Pi Energy Rate</label>
          <div class="value text-green">${PI_RATE_CENTS_KWH}c/kWh</div>
          <div class="sub">Flat rate, no supply charge</div>
        </div>
      </div>
    </div>
    
    <!-- Pi Energy Savings Analysis -->
    <div class="section">
      <div class="section-header">
        <h2>Pi Energy Savings Analysis</h2>
      </div>
      
      <div class="summary-box">
        <h3>Your Potential Savings with ${PI_NAME}</h3>
        <div class="big-number">$${savingsAnalysis.totalSavings.toFixed(2)}</div>
        <div class="description">
          ${savingsAnalysis.savingsPercentage.toFixed(1)}% savings over ${billCoverage.totalDays} days analyzed
        </div>
      </div>
      
      <div class="grid-4">
        <div class="info-card">
          <label>Current Retailer Total</label>
          <div class="value">$${savingsAnalysis.totalCurrentCost.toFixed(2)}</div>
        </div>
        <div class="info-card highlight">
          <label>Pi Energy Total</label>
          <div class="value text-green">$${savingsAnalysis.totalPiCost.toFixed(2)}</div>
        </div>
        <div class="info-card">
          <label>Total Grid Import</label>
          <div class="value">${savingsAnalysis.totalGridImportKwh.toLocaleString()} kWh</div>
        </div>
        <div class="info-card">
          <label>Avg Daily Usage</label>
          <div class="value">${savingsAnalysis.averageDailyKwh.toFixed(1)} kWh</div>
        </div>
      </div>
      
      <div class="chart-container">
        ${costComparisonSVG}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Billing Period</th>
            <th class="text-center">Days</th>
            <th class="text-right">Usage (kWh)</th>
            <th class="text-right">Current Cost</th>
            <th class="text-right">Pi Cost</th>
            <th class="text-right">Savings</th>
          </tr>
        </thead>
        <tbody>
          ${savingsAnalysis.periodBreakdown.map(p => `
            <tr>
              <td>${p.period}</td>
              <td class="text-center">${p.days}</td>
              <td class="text-right">${p.usageKwh.toLocaleString()}</td>
              <td class="text-right">$${p.currentCost.toFixed(2)}</td>
              <td class="text-right text-green">$${p.piCost.toFixed(2)}</td>
              <td class="text-right ${p.savings > 0 ? 'text-green' : 'text-red'}">$${p.savings.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: 600; background: #f3f4f6;">
            <td>TOTAL</td>
            <td class="text-center">${billCoverage.totalDays}</td>
            <td class="text-right">${savingsAnalysis.totalGridImportKwh.toLocaleString()}</td>
            <td class="text-right">$${savingsAnalysis.totalCurrentCost.toFixed(2)}</td>
            <td class="text-right text-green">$${savingsAnalysis.totalPiCost.toFixed(2)}</td>
            <td class="text-right text-green">$${savingsAnalysis.totalSavings.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    
    <!-- Forward Projection -->
    <div class="section page-break">
      <div class="section-header">
        <h2>Forward Cost Projection (${forwardProjection.projectionYears} Years)</h2>
      </div>
      
      <div class="info-card" style="margin-bottom: 15px;">
        <label>Projection Assumptions</label>
        <div style="font-size: 10px; color: #4b5563; margin-top: 5px;">
          <strong>Historical (2020-2025):</strong> ${PRICE_INCREASE_DATA.historical.minRate}%-${PRICE_INCREASE_DATA.historical.maxRate}% p.a. based on AER DMO data<br>
          <strong>Projected (2025-2035):</strong> ${PRICE_INCREASE_DATA.projected.minRate}%-${PRICE_INCREASE_DATA.projected.maxRate}% p.a. based on DMO/AER trends<br>
          <strong>Selected Scenario:</strong> ${forwardProjection.scenario === 'low' ? 'Conservative' : forwardProjection.scenario === 'high' ? 'High' : 'Mid-range'} (${forwardProjection.scenarioRate}% p.a.)<br>
          <strong>Pi Energy:</strong> Flat rate maintained at ${PI_RATE_CENTS_KWH}c/kWh with no supply charges
        </div>
      </div>
      
      <div class="summary-box">
        <h3>${forwardProjection.projectionYears}-Year Cumulative Savings with ${PI_NAME}</h3>
        <div class="big-number">$${forwardProjection.totalCumulativeSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <div class="description">
          Based on ${forwardProjection.scenarioRate}% annual price increase scenario
        </div>
      </div>
      
      <div class="grid-4">
        <div class="info-card">
          <label>Current Rate</label>
          <div class="value">${forwardProjection.baseRate.toFixed(2)}c/kWh</div>
        </div>
        <div class="info-card">
          <label>Rate in ${forwardProjection.projectionYears} Years</label>
          <div class="value text-red">${forwardProjection.projections[forwardProjection.projectionYears].retailerRate.toFixed(2)}c/kWh</div>
        </div>
        <div class="info-card highlight">
          <label>Pi Rate (Constant)</label>
          <div class="value text-green">${PI_RATE_CENTS_KWH}c/kWh</div>
        </div>
        <div class="info-card">
          <label>Annual Usage</label>
          <div class="value">${Math.round(forwardProjection.annualUsageKwh).toLocaleString()} kWh</div>
        </div>
      </div>
      
      <div class="chart-container">
        ${projectionSVG}
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th class="text-right">Retailer Rate</th>
            <th class="text-right">Pi Rate</th>
            <th class="text-right">Retailer Cost</th>
            <th class="text-right">Pi Cost</th>
            <th class="text-right">Annual Savings</th>
            <th class="text-right">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          ${forwardProjection.projections.map((p, i) => `
            <tr ${i === 0 ? 'style="background: #ecfdf5;"' : ''}>
              <td>${p.year}${i === 0 ? ' <span class="badge badge-green">Current</span>' : ''}</td>
              <td class="text-right text-red">${p.retailerRate.toFixed(2)}c</td>
              <td class="text-right text-green">${PI_RATE_CENTS_KWH}c</td>
              <td class="text-right">$${p.retailerCost.toFixed(2)}</td>
              <td class="text-right text-green">$${p.piCost.toFixed(2)}</td>
              <td class="text-right text-green">$${p.savings.toFixed(2)}</td>
              <td class="text-right ${i === 0 ? '' : 'text-green'}">${i === 0 ? '-' : '$' + p.cumulativeSavings.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>Disclaimer:</strong> These projections are based on historical DMO/AER price trend data and are for illustrative purposes only. 
      Actual future electricity prices may vary based on market conditions, government policy, network costs, and other factors. 
      ${PI_NAME}'s pricing is subject to their terms and conditions. This analysis should not be considered financial advice.</p>
      <p style="margin-top: 10px;">Report generated by Pi Energy Analysis Tool | ${data.generatedDate}</p>
    </div>
  </div>
  
  <script>
    // Auto-print when opened
    window.onload = function() {
      // Small delay to ensure styles are loaded
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;
}

// Export the report as PDF (opens print dialog)
export function exportToPDF(bills: AustralianBillData[], projectionYears: number = 10, scenario: 'low' | 'mid' | 'high' = 'mid'): void {
  const reportData = compileReportData(bills, projectionYears, scenario);
  const htmlContent = generatePDFHTML(reportData);
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
