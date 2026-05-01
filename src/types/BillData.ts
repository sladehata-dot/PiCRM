export const PI_RATE_CENTS_KWH = 26;
export const PI_NAME = 'Pi Energy';

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'BI_MONTHLY' | 'WEEKLY' | 'OTHER';
export type TariffType = 'TOU' | 'FIXED' | 'DEMAND';
export type EnergySource = 'GRID' | 'SOLAR' | 'MIXED';

export function getBillingCycleDisplay(cycle: BillingCycle | string): string {
  switch (cycle) {
    case 'MONTHLY': return 'Monthly';
    case 'QUARTERLY': return 'Quarterly';
    case 'BI_MONTHLY': return 'Bi-Monthly';
    case 'WEEKLY': return 'Weekly';
    default: return 'Other';
  }
}

export function getBillingCycleFromDays(days: number): BillingCycle {
  if (days <= 10) return 'WEEKLY';
  if (days <= 40) return 'MONTHLY';
  if (days <= 70) return 'BI_MONTHLY';
  if (days <= 100) return 'QUARTERLY';
  return 'OTHER';
}

export interface AustralianBillData {
  id?: string;
  fileName: string;
  uploadDate: string;
  nmi: string;
  retailer: string;
  customerName: string;
  serviceAddress: string;
  accountNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billingDays: number;
  billingCycle: BillingCycle;
  totalUsageKwh: number;
  gridImportKwh: number;
  solarExportKwh: number;
  averageDailyKwh: number;
  energySource: EnergySource;
  tariffType: TariffType;
  peakUsageKwh: number;
  offPeakUsageKwh: number;
  shoulderUsageKwh: number;
  controlledLoadKwh: number;
  peakRateCentsKwh: number;
  offPeakRateCentsKwh: number;
  shoulderRateCentsKwh: number;
  controlledLoadRateCentsKwh: number;
  singleRateCentsKwh: number;
  feedInTariffCentsKwh: number;
  dailySupplyChargeCents: number;
  usageCharges: number;
  supplyCharges: number;
  solarCredits: number;
  discounts: number;
  gst: number;
  totalAmount: number;
  powerPhases: 1 | 2 | 3;
  hasSolar: boolean;
  solarSystemSize: number | null;
  dueDate?: string;
}

export interface CustomerProfile {
  nmi: string;
  retailer: string;
  customerName: string;
  serviceAddress: string;
  accountNumber: string;
  powerPhases: 1 | 2 | 3;
  hasSolar: boolean;
  solarSystemSize: number | null;
  primaryTariffType: TariffType;
  typicalBillingCycle: BillingCycle;
}

export interface PiComparison {
  period: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  billingDays: number;
  billingCycle: BillingCycle;
  currentCost: number;
  piCost: number;
  savings: number;
  usageKwh: number;
  averageDailyKwh: number;
}

export interface YearlyAnalysis {
  totalSavings: number;
  annualizedSavings: number;
  annualizedCurrentCost: number;
  annualizedPiCost: number;
  annualizedUsageKwh: number;
  totalDays: number;
  // Extended fields used in modal
  totalCurrentCost?: number;
  totalPiCost?: number;
  savingsPercentage?: number;
}

export function calculateEffectiveRate(bills: AustralianBillData | AustralianBillData[]): number {
  const arr = Array.isArray(bills) ? bills : [bills];
  const totalKwh = arr.reduce((s, b) => s + b.gridImportKwh, 0);
  const totalCost = arr.reduce((s, b) => {
    if (b.tariffType === 'TOU') {
      return s + (b.peakUsageKwh * b.peakRateCentsKwh + b.offPeakUsageKwh * b.offPeakRateCentsKwh) / 100
        + (b.billingDays * b.dailySupplyChargeCents) / 100;
    }
    return s + (b.gridImportKwh * b.singleRateCentsKwh) / 100 + (b.billingDays * b.dailySupplyChargeCents) / 100;
  }, 0);
  return totalKwh > 0 ? (totalCost / totalKwh) * 100 : 0;
}
