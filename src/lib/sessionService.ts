import { supabase } from './supabase';
import { AustralianBillData, YearlyAnalysis, CustomerProfile } from '@/types/BillData';
import { QualifierData } from '@/components/CustomerQualifiers';

// Session status types
export type SessionStatus = 'in_progress' | 'eligible' | 'not_eligible' | 'completed' | 'archived';

// Contact address interface
export interface ContactAddress {
  streetAddress: string;
  suburb: string;
  state: string;
  postcode: string;
}

// Customer session interface
export interface CustomerSession {
  id: string;
  sessionCode: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  status: SessionStatus;
  qualifiers: QualifierData;
  isEligible: boolean | null;
  eligibilityReason?: string;
  bills: AustralianBillData[];
  customerProfile?: CustomerProfile;
  comparisonResults?: any;
  yearlyAnalysis?: YearlyAnalysis;
  salesNotes?: string;
  assignedSalesRep?: string;
  source: string;
  referralCode?: string;
  // Contact address fields
  contactAddress?: ContactAddress;
  contactSameAsProperty: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  completedAt?: string;
}

// Session summary for lists
export interface SessionSummary {
  id: string;
  sessionCode: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: SessionStatus;
  isEligible: boolean | null;
  postcode?: string;
  serviceAddress?: string;
  contactAddress?: ContactAddress;
  contactSameAsProperty: boolean;
  billCount: number;
  totalSavings?: number;
  workflowStage?: string;
  createdAt: string;
  updatedAt: string;
}




// Result types
export interface SessionResult {
  success: boolean;
  session?: CustomerSession;
  sessionCode?: string;
  error?: string;
}

export interface SessionListResult {
  success: boolean;
  sessions?: SessionSummary[];
  error?: string;
}

// Convert database record to CustomerSession
function dbToSession(record: any): CustomerSession {
  return {
    id: record.id,
    sessionCode: record.session_code,
    customerEmail: record.customer_email,
    customerPhone: record.customer_phone,
    customerName: record.customer_name,
    status: record.status,
    qualifiers: record.qualifiers || {},
    isEligible: record.is_eligible,
    eligibilityReason: record.eligibility_reason,
    bills: record.bills || [],
    customerProfile: record.customer_profile,
    comparisonResults: record.comparison_results,
    yearlyAnalysis: record.yearly_analysis,
    salesNotes: record.sales_notes,
    assignedSalesRep: record.assigned_sales_rep,
    source: record.source || 'web',
    referralCode: record.referral_code,
    // Contact address fields
    contactAddress: record.contact_street_address ? {
      streetAddress: record.contact_street_address || '',
      suburb: record.contact_suburb || '',
      state: record.contact_state || '',
      postcode: record.contact_postcode || '',
    } : undefined,
    contactSameAsProperty: record.contact_same_as_property ?? true,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    lastActivityAt: record.last_activity_at,
    completedAt: record.completed_at,
  };
}



// Convert database record to SessionSummary
function dbToSummary(record: any): SessionSummary {
  const qualifiers = record.qualifiers || {};
  const yearlyAnalysis = record.yearly_analysis;
  const bills = record.bills || [];
  const customerProfile = record.customer_profile;
  
  // Get customer name from session, customer profile, or from bills
  const customerName = record.customer_name || 
    customerProfile?.customerName ||
    (bills.length > 0 ? bills[0].customerName : null);
  
  // Get service address from customer profile or bills
  // Try multiple sources to ensure we capture the address
  let serviceAddress: string | null = null;
  
  // First try customer profile
  if (customerProfile?.serviceAddress) {
    serviceAddress = customerProfile.serviceAddress;
  }
  // Then try bills array
  else if (bills.length > 0) {
    // Check each bill for a service address
    for (const bill of bills) {
      if (bill.serviceAddress) {
        serviceAddress = bill.serviceAddress;
        break;
      }
    }
  }
  
  // Get contact address if set
  const contactAddress = record.contact_street_address ? {
    streetAddress: record.contact_street_address || '',
    suburb: record.contact_suburb || '',
    state: record.contact_state || '',
    postcode: record.contact_postcode || '',
  } : undefined;
  
  return {
    id: record.id,
    sessionCode: record.session_code,
    customerName: customerName,
    customerEmail: record.customer_email,
    customerPhone: record.customer_phone,
    status: record.status,
    isEligible: record.is_eligible,
    postcode: qualifiers.postcode ?? undefined,
    serviceAddress: serviceAddress ?? undefined,
    contactAddress: contactAddress,
    contactSameAsProperty: record.contact_same_as_property ?? true,
    billCount: bills.length,
    totalSavings: yearlyAnalysis?.totalSavings,
    workflowStage: record.workflow_stage || 'bill_analysis',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}






// Create a new session
export async function createSession(
  qualifiers?: QualifierData,
  source: string = 'web'
): Promise<SessionResult> {
  try {
    const { data, error } = await supabase
      .from('customer_sessions')
      .insert({
        qualifiers: qualifiers || {},
        source,
        status: 'in_progress',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      session: dbToSession(data),
      sessionCode: data.session_code,
    };
  } catch (error: any) {
    console.error('Error creating session:', error);
    return { success: false, error: error.message };
  }
}

// Get session by ID
export async function getSessionById(id: string): Promise<SessionResult> {
  try {
    const { data, error } = await supabase
      .from('customer_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error getting session:', error);
      return { success: false, error: 'Session not found' };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error getting session:', error);
    return { success: false, error: error.message };
  }
}

// Get session by session code
export async function getSessionByCode(sessionCode: string): Promise<SessionResult> {
  try {
    const cleanCode = sessionCode.toUpperCase().trim();
    
    if (cleanCode.length !== 8) {
      return { success: false, error: 'Invalid session code format' };
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .select('*')
      .eq('session_code', cleanCode)
      .single();

    if (error) {
      console.error('Error getting session by code:', error);
      return { success: false, error: 'Session not found with this code' };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error getting session by code:', error);
    return { success: false, error: error.message };
  }
}

// Update session qualifiers
export async function updateSessionQualifiers(
  sessionId: string,
  qualifiers: QualifierData,
  isEligible?: boolean,
  eligibilityReason?: string
): Promise<SessionResult> {
  try {
    const updateData: any = {
      qualifiers,
    };

    if (isEligible !== undefined) {
      updateData.is_eligible = isEligible;
      updateData.status = isEligible ? 'eligible' : 'not_eligible';
    }

    if (eligibilityReason) {
      updateData.eligibility_reason = eligibilityReason;
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session qualifiers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session qualifiers:', error);
    return { success: false, error: error.message };
  }
}

// Update session bills and auto-populate customer info from bill data
export async function updateSessionBills(
  sessionId: string,
  bills: AustralianBillData[],
  customerProfile?: CustomerProfile
): Promise<SessionResult> {
  try {
    const updateData: any = {
      bills,
    };

    if (customerProfile) {
      updateData.customer_profile = customerProfile;
    }

    // Auto-populate customer info from the most recent bill if not already set
    if (bills.length > 0) {
      // Sort bills by date to get the most recent
      const sortedBills = [...bills].sort((a, b) => {
        const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
        const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });
      
      const latestBill = sortedBills[0];
      
      // Get current session to check if customer info is already set
      const { data: currentSession } = await supabase
        .from('customer_sessions')
        .select('customer_name, customer_email')
        .eq('id', sessionId)
        .single();
      
      // Only update customer name if not already set and bill has a name
      if (!currentSession?.customer_name && latestBill.customerName) {
        updateData.customer_name = latestBill.customerName;
      }
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session bills:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session bills:', error);
    return { success: false, error: error.message };
  }
}


// Update session comparison results
export async function updateSessionComparison(
  sessionId: string,
  comparisonResults: any,
  yearlyAnalysis?: YearlyAnalysis
): Promise<SessionResult> {
  try {
    const updateData: any = {
      comparison_results: comparisonResults,
    };

    if (yearlyAnalysis) {
      updateData.yearly_analysis = yearlyAnalysis;
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session comparison:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session comparison:', error);
    return { success: false, error: error.message };
  }
}

// Update session customer info
export async function updateSessionCustomerInfo(
  sessionId: string,
  customerInfo: {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }
): Promise<SessionResult> {
  try {
    const { data, error } = await supabase
      .from('customer_sessions')
      .update({
        customer_name: customerInfo.customerName,
        customer_email: customerInfo.customerEmail,
        customer_phone: customerInfo.customerPhone,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session customer info:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session customer info:', error);
    return { success: false, error: error.message };
  }
}

// Update session contact address
export async function updateSessionContactAddress(
  sessionId: string,
  contactAddress: ContactAddress | null,
  sameAsProperty: boolean
): Promise<SessionResult> {
  try {
    const updateData: any = {
      contact_same_as_property: sameAsProperty,
    };
    
    if (sameAsProperty || !contactAddress) {
      // Clear contact address fields if same as property
      updateData.contact_street_address = null;
      updateData.contact_suburb = null;
      updateData.contact_state = null;
      updateData.contact_postcode = null;
    } else {
      // Set contact address fields
      updateData.contact_street_address = contactAddress.streetAddress;
      updateData.contact_suburb = contactAddress.suburb;
      updateData.contact_state = contactAddress.state;
      updateData.contact_postcode = contactAddress.postcode;
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session contact address:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session contact address:', error);
    return { success: false, error: error.message };
  }
}



// Update session status
export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<SessionResult> {
  try {
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session status:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session status:', error);
    return { success: false, error: error.message };
  }
}

// Update sales notes
export async function updateSessionSalesNotes(
  sessionId: string,
  salesNotes: string,
  assignedSalesRep?: string
): Promise<SessionResult> {
  try {
    const updateData: any = { sales_notes: salesNotes };
    
    if (assignedSalesRep) {
      updateData.assigned_sales_rep = assignedSalesRep;
    }

    const { data, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating session sales notes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, session: dbToSession(data) };
  } catch (error: any) {
    console.error('Error updating session sales notes:', error);
    return { success: false, error: error.message };
  }
}

// Full session update (for auto-save)
// This function also extracts customer info from bills if not already set
export async function saveFullSession(
  sessionId: string,
  data: {
    qualifiers?: QualifierData;
    isEligible?: boolean;
    eligibilityReason?: string;
    bills?: AustralianBillData[];
    customerProfile?: CustomerProfile;
    comparisonResults?: any;
    yearlyAnalysis?: YearlyAnalysis;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    status?: SessionStatus;
  }
): Promise<SessionResult> {
  try {
    const updateData: any = {};

    if (data.qualifiers !== undefined) updateData.qualifiers = data.qualifiers;
    if (data.isEligible !== undefined) updateData.is_eligible = data.isEligible;
    if (data.eligibilityReason !== undefined) updateData.eligibility_reason = data.eligibilityReason;
    if (data.bills !== undefined) updateData.bills = data.bills;
    if (data.customerProfile !== undefined) updateData.customer_profile = data.customerProfile;
    if (data.comparisonResults !== undefined) updateData.comparison_results = data.comparisonResults;
    if (data.yearlyAnalysis !== undefined) updateData.yearly_analysis = data.yearlyAnalysis;
    if (data.customerName !== undefined) updateData.customer_name = data.customerName;
    if (data.customerEmail !== undefined) updateData.customer_email = data.customerEmail;
    if (data.customerPhone !== undefined) updateData.customer_phone = data.customerPhone;
    if (data.status !== undefined) updateData.status = data.status;

    // If bills are being saved, extract customer info from the bills
    if (data.bills && data.bills.length > 0) {
      // Get current session to check if customer info is already set
      const { data: currentSession } = await supabase
        .from('customer_sessions')
        .select('customer_name, customer_email, customer_phone, customer_profile')
        .eq('id', sessionId)
        .single();

      // Sort bills by date to get the most recent
      const sortedBills = [...data.bills].sort((a, b) => {
        const dateA = new Date(a.billingPeriodEnd.split('/').reverse().join('-'));
        const dateB = new Date(b.billingPeriodEnd.split('/').reverse().join('-'));
        return dateB.getTime() - dateA.getTime();
      });
      
      const latestBill = sortedBills[0];

      // Update customer name from bill if not already set and not being explicitly set
      if (!currentSession?.customer_name && !data.customerName && latestBill.customerName) {
        updateData.customer_name = latestBill.customerName;
      }
      
      // Also update customer_profile with service address from bill if not already set
      // This ensures the service address is captured even if customer_profile wasn't explicitly set
      const existingProfile = currentSession?.customer_profile || data.customerProfile || {};
      if (!existingProfile.serviceAddress && latestBill.serviceAddress) {
        updateData.customer_profile = {
          ...existingProfile,
          serviceAddress: latestBill.serviceAddress,
          customerName: latestBill.customerName || existingProfile.customerName,
          retailer: latestBill.retailer || existingProfile.retailer,
          nmi: latestBill.nmi || existingProfile.nmi,
        };
      }
    }

    // Log what we're saving for debugging
    console.log('saveFullSession - sessionId:', sessionId);
    console.log('saveFullSession - bills count:', data.bills?.length || 0);
    console.log('saveFullSession - updateData keys:', Object.keys(updateData));

    const { data: result, error } = await supabase
      .from('customer_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error saving full session:', error);
      return { success: false, error: error.message };
    }

    console.log('saveFullSession - success, bills in result:', result.bills?.length || 0);
    return { success: true, session: dbToSession(result) };
  } catch (error: any) {
    console.error('Error saving full session:', error);
    return { success: false, error: error.message };
  }
}



// Get all sessions (for sales staff)
export async function getAllSessions(
  options?: {
    status?: SessionStatus;
    limit?: number;
    offset?: number;
    search?: string;
  }
): Promise<SessionListResult> {
  try {
    let query = supabase
      .from('customer_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.search) {
      const searchTerm = options.search.toLowerCase();
      query = query.or(
        `session_code.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`
      );
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error getting sessions:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      sessions: (data || []).map(dbToSummary),
    };
  } catch (error: any) {
    console.error('Error getting sessions:', error);
    return { success: false, error: error.message };
  }
}

// Get recent sessions
export async function getRecentSessions(limit: number = 10): Promise<SessionListResult> {
  return getAllSessions({ limit });
}

// Get eligible sessions
export async function getEligibleSessions(limit: number = 20): Promise<SessionListResult> {
  return getAllSessions({ status: 'eligible', limit });
}

// Delete session
export async function deleteSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customer_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error deleting session:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting session:', error);
    return { success: false, error: error.message };
  }
}

// Archive session
export async function archiveSession(sessionId: string): Promise<SessionResult> {
  return updateSessionStatus(sessionId, 'archived');
}
