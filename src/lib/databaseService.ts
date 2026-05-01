import { supabase } from './supabase';
import { AustralianBillData, CustomerProfile, getBillingCycleFromDays } from '@/types/BillData';

// Types for database records
interface CustomerRecord {
  id: string;
  nmi: string;
  retailer: string | null;
  customer_name: string | null;
  service_address: string | null;
  account_number: string | null;
  power_phases: number;
  has_solar: boolean;
  solar_system_size: number | null;
  primary_tariff_type: string;
  typical_billing_cycle: string;
  created_at: string;
  updated_at: string;
}

interface BillRecord {
  id: string;
  customer_id: string;
  file_name: string | null;
  upload_date: string | null;
  billing_period_start: string;
  billing_period_end: string;
  billing_days: number | null;
  billing_cycle: string | null;
  total_usage_kwh: number;
  grid_import_kwh: number;
  solar_export_kwh: number;
  average_daily_kwh: number;
  energy_source: string;
  tariff_type: string;
  peak_usage_kwh: number;
  off_peak_usage_kwh: number;
  shoulder_usage_kwh: number;
  controlled_load_kwh: number;
  peak_rate_cents_kwh: number;
  off_peak_rate_cents_kwh: number;
  shoulder_rate_cents_kwh: number;
  controlled_load_rate_cents_kwh: number;
  single_rate_cents_kwh: number;
  feed_in_tariff_cents_kwh: number;
  daily_supply_charge_cents: number;
  usage_charges: number;
  supply_charges: number;
  solar_credits: number;
  discounts: number;
  gst: number;
  total_amount: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveResult {
  success: boolean;
  customerId?: string;
  error?: string;
  savedBillsCount?: number;
}

export interface LoadResult {
  success: boolean;
  customer?: CustomerProfile;
  bills?: AustralianBillData[];
  error?: string;
}

export interface SearchResult {
  success: boolean;
  customers?: Array<{
    id: string;
    nmi: string;
    customerName: string;
    serviceAddress: string;
    retailer: string;
    billCount: number;
    lastUpdated: string;
  }>;
  error?: string;
}

// Validation functions
function validateNMI(nmi: string): { valid: boolean; error?: string } {
  if (!nmi || nmi.trim() === '') {
    return { valid: false, error: 'NMI is required' };
  }
  // Australian NMI is typically 10-11 digits
  const cleanNMI = nmi.replace(/\s/g, '');
  if (!/^\d{10,11}$/.test(cleanNMI)) {
    return { valid: false, error: 'NMI must be 10-11 digits' };
  }
  return { valid: true };
}

function validateBillData(bill: AustralianBillData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!bill.billingPeriodStart) {
    errors.push('Billing period start date is required');
  }
  if (!bill.billingPeriodEnd) {
    errors.push('Billing period end date is required');
  }
  if (bill.gridImportKwh < 0) {
    errors.push('Grid import kWh cannot be negative');
  }
  if (bill.totalAmount < 0) {
    errors.push('Total amount cannot be negative');
  }
  
  return { valid: errors.length === 0, errors };
}

// Convert date string from DD/MM/YYYY to YYYY-MM-DD for database
function convertDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // Check if already in ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Convert from DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return dateStr;
}

// Convert date string from YYYY-MM-DD to DD/MM/YYYY for display
function convertDateFromISO(dateStr: string): string {
  if (!dateStr) return '';
  
  // Check if in ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
}

// Extract customer profile from bills
function extractCustomerProfile(bills: AustralianBillData[]): CustomerProfile | null {
  if (bills.length === 0) return null;
  
  // Use the most recent bill for customer info
  const sortedBills = [...bills].sort((a, b) => {
    const dateA = new Date(convertDateToISO(a.billingPeriodEnd));
    const dateB = new Date(convertDateToISO(b.billingPeriodEnd));
    return dateB.getTime() - dateA.getTime();
  });
  
  const latestBill = sortedBills[0];
  
  // Determine typical billing cycle from all bills
  const cycleCounts: Record<string, number> = {};
  bills.forEach(bill => {
    cycleCounts[bill.billingCycle] = (cycleCounts[bill.billingCycle] || 0) + 1;
  });
  const typicalCycle = Object.entries(cycleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MONTHLY';
  
  return {
    nmi: latestBill.nmi,
    retailer: latestBill.retailer,
    customerName: latestBill.customerName,
    serviceAddress: latestBill.serviceAddress,
    accountNumber: latestBill.accountNumber,
    powerPhases: latestBill.powerPhases,
    hasSolar: latestBill.hasSolar,
    solarSystemSize: latestBill.solarSystemSize,
    primaryTariffType: latestBill.tariffType,
    typicalBillingCycle: typicalCycle as any
  };
}

// Save customer and bills to database
export async function saveAnalysisSession(bills: AustralianBillData[]): Promise<SaveResult> {
  try {
    if (bills.length === 0) {
      return { success: false, error: 'No bills to save' };
    }
    
    // Extract customer profile
    const customerProfile = extractCustomerProfile(bills);
    if (!customerProfile) {
      return { success: false, error: 'Could not extract customer profile from bills' };
    }
    
    // Validate NMI
    const nmiValidation = validateNMI(customerProfile.nmi);
    if (!nmiValidation.valid) {
      return { success: false, error: nmiValidation.error };
    }
    
    // Validate all bills
    for (const bill of bills) {
      const billValidation = validateBillData(bill);
      if (!billValidation.valid) {
        return { success: false, error: `Bill validation failed: ${billValidation.errors.join(', ')}` };
      }
    }
    
    // Check if customer already exists
    const { data: existingCustomer, error: searchError } = await supabase
      .from('customers')
      .select('id')
      .eq('nmi', customerProfile.nmi.replace(/\s/g, ''))
      .single();
    
    let customerId: string;
    
    if (existingCustomer) {
      // Update existing customer
      customerId = existingCustomer.id;
      
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          retailer: customerProfile.retailer,
          customer_name: customerProfile.customerName,
          service_address: customerProfile.serviceAddress,
          account_number: customerProfile.accountNumber,
          power_phases: customerProfile.powerPhases,
          has_solar: customerProfile.hasSolar,
          solar_system_size: customerProfile.solarSystemSize,
          primary_tariff_type: customerProfile.primaryTariffType,
          typical_billing_cycle: customerProfile.typicalBillingCycle
        })
        .eq('id', customerId);
      
      if (updateError) {
        console.error('Error updating customer:', updateError);
        return { success: false, error: `Failed to update customer: ${updateError.message}` };
      }
      
      // Delete existing bills for this customer (we'll re-insert all)
      const { error: deleteError } = await supabase
        .from('bills')
        .delete()
        .eq('customer_id', customerId);
      
      if (deleteError) {
        console.error('Error deleting existing bills:', deleteError);
        return { success: false, error: `Failed to update bills: ${deleteError.message}` };
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          nmi: customerProfile.nmi.replace(/\s/g, ''),
          retailer: customerProfile.retailer,
          customer_name: customerProfile.customerName,
          service_address: customerProfile.serviceAddress,
          account_number: customerProfile.accountNumber,
          power_phases: customerProfile.powerPhases,
          has_solar: customerProfile.hasSolar,
          solar_system_size: customerProfile.solarSystemSize,
          primary_tariff_type: customerProfile.primaryTariffType,
          typical_billing_cycle: customerProfile.typicalBillingCycle
        })
        .select('id')
        .single();
      
      if (insertError || !newCustomer) {
        console.error('Error creating customer:', insertError);
        return { success: false, error: `Failed to create customer: ${insertError?.message}` };
      }
      
      customerId = newCustomer.id;
    }
    
    // Insert all bills
    const billRecords = bills.map(bill => ({
      customer_id: customerId,
      file_name: bill.fileName,
      upload_date: bill.uploadDate,
      billing_period_start: convertDateToISO(bill.billingPeriodStart),
      billing_period_end: convertDateToISO(bill.billingPeriodEnd),
      billing_days: bill.billingDays,
      billing_cycle: bill.billingCycle,
      total_usage_kwh: bill.totalUsageKwh,
      grid_import_kwh: bill.gridImportKwh,
      solar_export_kwh: bill.solarExportKwh,
      average_daily_kwh: bill.averageDailyKwh,
      energy_source: bill.energySource,
      tariff_type: bill.tariffType,
      peak_usage_kwh: bill.peakUsageKwh,
      off_peak_usage_kwh: bill.offPeakUsageKwh,
      shoulder_usage_kwh: bill.shoulderUsageKwh,
      controlled_load_kwh: bill.controlledLoadKwh,
      peak_rate_cents_kwh: bill.peakRateCentsKwh,
      off_peak_rate_cents_kwh: bill.offPeakRateCentsKwh,
      shoulder_rate_cents_kwh: bill.shoulderRateCentsKwh,
      controlled_load_rate_cents_kwh: bill.controlledLoadRateCentsKwh,
      single_rate_cents_kwh: bill.singleRateCentsKwh,
      feed_in_tariff_cents_kwh: bill.feedInTariffCentsKwh,
      daily_supply_charge_cents: bill.dailySupplyChargeCents,
      usage_charges: bill.usageCharges,
      supply_charges: bill.supplyCharges,
      solar_credits: bill.solarCredits,
      discounts: bill.discounts,
      gst: bill.gst,
      total_amount: bill.totalAmount,
      due_date: bill.dueDate ? convertDateToISO(bill.dueDate) : null
    }));
    
    const { error: billsError } = await supabase
      .from('bills')
      .insert(billRecords);
    
    if (billsError) {
      console.error('Error inserting bills:', billsError);
      return { success: false, error: `Failed to save bills: ${billsError.message}` };
    }
    
    return { 
      success: true, 
      customerId, 
      savedBillsCount: bills.length 
    };
  } catch (error: any) {
    console.error('Error saving analysis session:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

// Load customer and bills by NMI
export async function loadByNMI(nmi: string): Promise<LoadResult> {
  try {
    const nmiValidation = validateNMI(nmi);
    if (!nmiValidation.valid) {
      return { success: false, error: nmiValidation.error };
    }
    
    const cleanNMI = nmi.replace(/\s/g, '');
    
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('nmi', cleanNMI)
      .single();
    
    if (customerError || !customer) {
      return { success: false, error: 'Customer not found with this NMI' };
    }
    
    return loadByCustomerId(customer.id);
  } catch (error: any) {
    console.error('Error loading by NMI:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

// Load customer and bills by customer ID
export async function loadByCustomerId(customerId: string): Promise<LoadResult> {
  try {
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();
    
    if (customerError || !customer) {
      return { success: false, error: 'Customer not found' };
    }
    
    // Get bills
    const { data: billRecords, error: billsError } = await supabase
      .from('bills')
      .select('*')
      .eq('customer_id', customerId)
      .order('billing_period_start', { ascending: false });
    
    if (billsError) {
      console.error('Error loading bills:', billsError);
      return { success: false, error: `Failed to load bills: ${billsError.message}` };
    }
    
    // Convert customer record to CustomerProfile
    const customerProfile: CustomerProfile = {
      nmi: customer.nmi,
      retailer: customer.retailer || '',
      customerName: customer.customer_name || '',
      serviceAddress: customer.service_address || '',
      accountNumber: customer.account_number || '',
      powerPhases: customer.power_phases as 1 | 2 | 3,
      hasSolar: customer.has_solar,
      solarSystemSize: customer.solar_system_size,
      primaryTariffType: customer.primary_tariff_type as 'TOU' | 'FIXED' | 'DEMAND',
      typicalBillingCycle: customer.typical_billing_cycle as any
    };
    
    // Convert bill records to AustralianBillData
    const bills: AustralianBillData[] = (billRecords || []).map((record: BillRecord) => ({
      id: record.id,
      fileName: record.file_name || '',
      uploadDate: record.upload_date || '',
      nmi: customer.nmi,
      retailer: customer.retailer || '',
      customerName: customer.customer_name || '',
      serviceAddress: customer.service_address || '',
      accountNumber: customer.account_number || '',
      billingPeriodStart: convertDateFromISO(record.billing_period_start),
      billingPeriodEnd: convertDateFromISO(record.billing_period_end),
      billingDays: record.billing_days || 30,
      billingCycle: (record.billing_cycle || 'MONTHLY') as any,
      totalUsageKwh: Number(record.total_usage_kwh) || 0,
      gridImportKwh: Number(record.grid_import_kwh) || 0,
      solarExportKwh: Number(record.solar_export_kwh) || 0,
      averageDailyKwh: Number(record.average_daily_kwh) || 0,
      energySource: (record.energy_source || 'GRID') as any,
      tariffType: (record.tariff_type || 'FIXED') as any,
      peakUsageKwh: Number(record.peak_usage_kwh) || 0,
      offPeakUsageKwh: Number(record.off_peak_usage_kwh) || 0,
      shoulderUsageKwh: Number(record.shoulder_usage_kwh) || 0,
      controlledLoadKwh: Number(record.controlled_load_kwh) || 0,
      peakRateCentsKwh: Number(record.peak_rate_cents_kwh) || 0,
      offPeakRateCentsKwh: Number(record.off_peak_rate_cents_kwh) || 0,
      shoulderRateCentsKwh: Number(record.shoulder_rate_cents_kwh) || 0,
      controlledLoadRateCentsKwh: Number(record.controlled_load_rate_cents_kwh) || 0,
      singleRateCentsKwh: Number(record.single_rate_cents_kwh) || 0,
      feedInTariffCentsKwh: Number(record.feed_in_tariff_cents_kwh) || 0,
      dailySupplyChargeCents: Number(record.daily_supply_charge_cents) || 0,
      usageCharges: Number(record.usage_charges) || 0,
      supplyCharges: Number(record.supply_charges) || 0,
      solarCredits: Number(record.solar_credits) || 0,
      discounts: Number(record.discounts) || 0,
      gst: Number(record.gst) || 0,
      totalAmount: Number(record.total_amount) || 0,
      powerPhases: customer.power_phases as 1 | 2 | 3,
      hasSolar: customer.has_solar,
      solarSystemSize: customer.solar_system_size,
      dueDate: record.due_date ? convertDateFromISO(record.due_date) : ''
    }));
    
    return { success: true, customer: customerProfile, bills };
  } catch (error: any) {
    console.error('Error loading by customer ID:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

// Search for customers
export async function searchCustomers(query: string): Promise<SearchResult> {
  try {
    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must be at least 2 characters' };
    }
    
    const searchTerm = query.trim().toLowerCase();
    
    // Search by NMI, customer name, or service address
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        nmi,
        customer_name,
        service_address,
        retailer,
        updated_at,
        bills(count)
      `)
      .or(`nmi.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,service_address.ilike.%${searchTerm}%`)
      .order('updated_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error searching customers:', error);
      return { success: false, error: `Search failed: ${error.message}` };
    }
    
    const results = (customers || []).map((c: any) => ({
      id: c.id,
      nmi: c.nmi,
      customerName: c.customer_name || '',
      serviceAddress: c.service_address || '',
      retailer: c.retailer || '',
      billCount: c.bills?.[0]?.count || 0,
      lastUpdated: c.updated_at
    }));
    
    return { success: true, customers: results };
  } catch (error: any) {
    console.error('Error searching customers:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

// Get all saved sessions (recent customers)
export async function getRecentSessions(limit: number = 10): Promise<SearchResult> {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        nmi,
        customer_name,
        service_address,
        retailer,
        updated_at,
        bills(count)
      `)
      .order('updated_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error getting recent sessions:', error);
      return { success: false, error: `Failed to load sessions: ${error.message}` };
    }
    
    const results = (customers || []).map((c: any) => ({
      id: c.id,
      nmi: c.nmi,
      customerName: c.customer_name || '',
      serviceAddress: c.service_address || '',
      retailer: c.retailer || '',
      billCount: c.bills?.[0]?.count || 0,
      lastUpdated: c.updated_at
    }));
    
    return { success: true, customers: results };
  } catch (error: any) {
    console.error('Error getting recent sessions:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

// Delete a saved session
export async function deleteSession(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: `Failed to delete session: ${error.message}` };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}
