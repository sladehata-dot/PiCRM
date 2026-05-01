import { supabase } from './supabase';
import {
  WorkflowStage,
  SiteInspection,
  Installation,
  SystemComponent,
  MaintenanceAlert,
  MaintenanceTask,
  ProposalData,
  InspectionStatus,
  InstallationStatus,
  AlertStatus,
  TaskStatus,
} from '@/types/WorkflowTypes';

// Helper to convert DB records
function dbToSiteInspection(record: any): SiteInspection {
  return {
    id: record.id,
    sessionId: record.session_id,
    scheduledDate: record.scheduled_date,
    scheduledTime: record.scheduled_time,
    inspectorName: record.inspector_name,
    inspectorPhone: record.inspector_phone,
    status: record.status,
    roofType: record.roof_type,
    roofCondition: record.roof_condition,
    roofOrientation: record.roof_orientation,
    roofAngleDegrees: record.roof_angle_degrees,
    shadingAssessment: record.shading_assessment,
    availableRoofSpaceSqm: record.available_roof_space_sqm,
    switchboardCondition: record.switchboard_condition,
    currentPhases: record.current_phases,
    meterType: record.meter_type,
    requiresRoofRepairs: record.requires_roof_repairs || false,
    requiresSwitchboardUpgrade: record.requires_switchboard_upgrade || false,
    requiresMeterUpgrade: record.requires_meter_upgrade || false,
    requiresStructuralWork: record.requires_structural_work || false,
    estimatedUpgradeCost: record.estimated_upgrade_cost || 0,
    notes: record.notes,
    photos: record.photos || [],
    recommendedSystemSizeKw: record.recommended_system_size_kw,
    recommendedBatteryKwh: record.recommended_battery_kwh,
    recommendedInverterKw: record.recommended_inverter_kw,
    completedAt: record.completed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToInstallation(record: any): Installation {
  return {
    id: record.id,
    sessionId: record.session_id,
    inspectionId: record.inspection_id,
    scheduledDate: record.scheduled_date,
    scheduledTime: record.scheduled_time,
    estimatedDurationHours: record.estimated_duration_hours || 8,
    leadInstaller: record.lead_installer,
    installerTeam: record.installer_team || [],
    status: record.status,
    solarPanelsCount: record.solar_panels_count,
    solarPanelModel: record.solar_panel_model,
    solarSystemSizeKw: record.solar_system_size_kw,
    inverterModel: record.inverter_model,
    inverterSizeKw: record.inverter_size_kw,
    batteryModel: record.battery_model,
    batteryCapacityKwh: record.battery_capacity_kwh,
    actualCompletionDate: record.actual_completion_date,
    commissioningDate: record.commissioning_date,
    gridConnectionDate: record.grid_connection_date,
    installationPhotos: record.installation_photos || [],
    complianceCertificates: record.compliance_certificates || [],
    warrantyInfo: record.warranty_info || {},
    notes: record.notes,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToSystemComponent(record: any): SystemComponent {
  return {
    id: record.id,
    sessionId: record.session_id,
    installationId: record.installation_id,
    componentType: record.component_type,
    model: record.model,
    serialNumber: record.serial_number,
    manufacturer: record.manufacturer,
    installedDate: record.installed_date,
    warrantyExpiry: record.warranty_expiry,
    expectedLifespanYears: record.expected_lifespan_years,
    status: record.status,
    healthPercentage: record.health_percentage || 100,
    lastReadingAt: record.last_reading_at,
    currentOutputKw: record.current_output_kw,
    dailyOutputKwh: record.daily_output_kwh,
    lifetimeOutputKwh: record.lifetime_output_kwh,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToMaintenanceAlert(record: any): MaintenanceAlert {
  return {
    id: record.id,
    sessionId: record.session_id,
    componentId: record.component_id,
    installationId: record.installation_id,
    alertType: record.alert_type,
    severity: record.severity,
    title: record.title,
    description: record.description,
    errorCode: record.error_code,
    status: record.status,
    assignedTo: record.assigned_to,
    resolutionNotes: record.resolution_notes,
    resolvedAt: record.resolved_at,
    resolvedBy: record.resolved_by,
    scheduledServiceDate: record.scheduled_service_date,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function dbToMaintenanceTask(record: any): MaintenanceTask {
  return {
    id: record.id,
    sessionId: record.session_id,
    alertId: record.alert_id,
    taskType: record.task_type,
    title: record.title,
    description: record.description,
    scheduledDate: record.scheduled_date,
    scheduledTime: record.scheduled_time,
    estimatedDurationHours: record.estimated_duration_hours,
    assignedTechnician: record.assigned_technician,
    technicianPhone: record.technician_phone,
    status: record.status,
    completedAt: record.completed_at,
    completionNotes: record.completion_notes,
    partsUsed: record.parts_used || [],
    laborHours: record.labor_hours,
    totalCost: record.total_cost,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

// Workflow Stage Management
export async function updateWorkflowStage(
  sessionId: string,
  stage: WorkflowStage
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customer_sessions')
      .update({ workflow_stage: stage })
      .eq('id', sessionId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error updating workflow stage:', error);
    return { success: false, error: error.message };
  }
}

export async function getWorkflowStage(sessionId: string): Promise<WorkflowStage | null> {
  try {
    const { data, error } = await supabase
      .from('customer_sessions')
      .select('workflow_stage')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data?.workflow_stage || 'bill_analysis';
  } catch (error) {
    console.error('Error getting workflow stage:', error);
    return null;
  }
}

// Proposal Management
export async function saveProposal(
  sessionId: string,
  proposalData: ProposalData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('customer_sessions')
      .update({
        proposal_data: proposalData,
        proposal_sent_at: new Date().toISOString(),
        workflow_stage: 'proposal_sent',
      })
      .eq('id', sessionId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error saving proposal:', error);
    return { success: false, error: error.message };
  }
}

export async function acceptProposal(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: session, error: fetchError } = await supabase
      .from('customer_sessions')
      .select('proposal_data')
      .eq('id', sessionId)
      .single();

    if (fetchError) throw fetchError;

    const updatedProposal = {
      ...session.proposal_data,
      termsAccepted: true,
      acceptedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('customer_sessions')
      .update({
        proposal_data: updatedProposal,
        proposal_accepted_at: new Date().toISOString(),
        workflow_stage: 'proposal_accepted',
      })
      .eq('id', sessionId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error accepting proposal:', error);
    return { success: false, error: error.message };
  }
}

// Site Inspection Management
export async function createSiteInspection(
  sessionId: string,
  data: Partial<SiteInspection>
): Promise<{ success: boolean; inspection?: SiteInspection; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('site_inspections')
      .insert({
        session_id: sessionId,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        inspector_name: data.inspectorName,
        inspector_phone: data.inspectorPhone,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;

    // Update workflow stage
    await updateWorkflowStage(sessionId, 'site_inspection_scheduled');

    return { success: true, inspection: dbToSiteInspection(result) };
  } catch (error: any) {
    console.error('Error creating site inspection:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSiteInspection(
  inspectionId: string,
  data: Partial<SiteInspection>
): Promise<{ success: boolean; inspection?: SiteInspection; error?: string }> {
  try {
    const updateData: any = {};
    
    if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
    if (data.scheduledTime !== undefined) updateData.scheduled_time = data.scheduledTime;
    if (data.inspectorName !== undefined) updateData.inspector_name = data.inspectorName;
    if (data.inspectorPhone !== undefined) updateData.inspector_phone = data.inspectorPhone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.roofType !== undefined) updateData.roof_type = data.roofType;
    if (data.roofCondition !== undefined) updateData.roof_condition = data.roofCondition;
    if (data.roofOrientation !== undefined) updateData.roof_orientation = data.roofOrientation;
    if (data.roofAngleDegrees !== undefined) updateData.roof_angle_degrees = data.roofAngleDegrees;
    if (data.shadingAssessment !== undefined) updateData.shading_assessment = data.shadingAssessment;
    if (data.availableRoofSpaceSqm !== undefined) updateData.available_roof_space_sqm = data.availableRoofSpaceSqm;
    if (data.switchboardCondition !== undefined) updateData.switchboard_condition = data.switchboardCondition;
    if (data.currentPhases !== undefined) updateData.current_phases = data.currentPhases;
    if (data.meterType !== undefined) updateData.meter_type = data.meterType;
    if (data.requiresRoofRepairs !== undefined) updateData.requires_roof_repairs = data.requiresRoofRepairs;
    if (data.requiresSwitchboardUpgrade !== undefined) updateData.requires_switchboard_upgrade = data.requiresSwitchboardUpgrade;
    if (data.requiresMeterUpgrade !== undefined) updateData.requires_meter_upgrade = data.requiresMeterUpgrade;
    if (data.requiresStructuralWork !== undefined) updateData.requires_structural_work = data.requiresStructuralWork;
    if (data.estimatedUpgradeCost !== undefined) updateData.estimated_upgrade_cost = data.estimatedUpgradeCost;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.photos !== undefined) updateData.photos = data.photos;
    if (data.recommendedSystemSizeKw !== undefined) updateData.recommended_system_size_kw = data.recommendedSystemSizeKw;
    if (data.recommendedBatteryKwh !== undefined) updateData.recommended_battery_kwh = data.recommendedBatteryKwh;
    if (data.recommendedInverterKw !== undefined) updateData.recommended_inverter_kw = data.recommendedInverterKw;

    const { data: result, error } = await supabase
      .from('site_inspections')
      .update(updateData)
      .eq('id', inspectionId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, inspection: dbToSiteInspection(result) };
  } catch (error: any) {
    console.error('Error updating site inspection:', error);
    return { success: false, error: error.message };
  }
}

export async function completeSiteInspection(
  inspectionId: string,
  sessionId: string,
  data: Partial<SiteInspection>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('site_inspections')
      .update({
        ...data,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', inspectionId);

    if (error) throw error;

    // Update workflow stage
    await updateWorkflowStage(sessionId, 'site_inspection_completed');

    return { success: true };
  } catch (error: any) {
    console.error('Error completing site inspection:', error);
    return { success: false, error: error.message };
  }
}

export async function getSiteInspection(sessionId: string): Promise<SiteInspection | null> {
  try {
    const { data, error } = await supabase
      .from('site_inspections')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return dbToSiteInspection(data);
  } catch (error) {
    console.error('Error getting site inspection:', error);
    return null;
  }
}

// Installation Management
export async function createInstallation(
  sessionId: string,
  data: Partial<Installation>
): Promise<{ success: boolean; installation?: Installation; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('installations')
      .insert({
        session_id: sessionId,
        inspection_id: data.inspectionId,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        estimated_duration_hours: data.estimatedDurationHours || 8,
        lead_installer: data.leadInstaller,
        installer_team: data.installerTeam || [],
        status: 'scheduled',
        solar_panels_count: data.solarPanelsCount,
        solar_panel_model: data.solarPanelModel,
        solar_system_size_kw: data.solarSystemSizeKw,
        inverter_model: data.inverterModel,
        inverter_size_kw: data.inverterSizeKw,
        battery_model: data.batteryModel,
        battery_capacity_kwh: data.batteryCapacityKwh,
      })
      .select()
      .single();

    if (error) throw error;

    // Update workflow stage
    await updateWorkflowStage(sessionId, 'installation_scheduled');

    return { success: true, installation: dbToInstallation(result) };
  } catch (error: any) {
    console.error('Error creating installation:', error);
    return { success: false, error: error.message };
  }
}

export async function updateInstallation(
  installationId: string,
  data: Partial<Installation>
): Promise<{ success: boolean; installation?: Installation; error?: string }> {
  try {
    const updateData: any = {};
    
    if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
    if (data.scheduledTime !== undefined) updateData.scheduled_time = data.scheduledTime;
    if (data.estimatedDurationHours !== undefined) updateData.estimated_duration_hours = data.estimatedDurationHours;
    if (data.leadInstaller !== undefined) updateData.lead_installer = data.leadInstaller;
    if (data.installerTeam !== undefined) updateData.installer_team = data.installerTeam;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.solarPanelsCount !== undefined) updateData.solar_panels_count = data.solarPanelsCount;
    if (data.solarPanelModel !== undefined) updateData.solar_panel_model = data.solarPanelModel;
    if (data.solarSystemSizeKw !== undefined) updateData.solar_system_size_kw = data.solarSystemSizeKw;
    if (data.inverterModel !== undefined) updateData.inverter_model = data.inverterModel;
    if (data.inverterSizeKw !== undefined) updateData.inverter_size_kw = data.inverterSizeKw;
    if (data.batteryModel !== undefined) updateData.battery_model = data.batteryModel;
    if (data.batteryCapacityKwh !== undefined) updateData.battery_capacity_kwh = data.batteryCapacityKwh;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { data: result, error } = await supabase
      .from('installations')
      .update(updateData)
      .eq('id', installationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, installation: dbToInstallation(result) };
  } catch (error: any) {
    console.error('Error updating installation:', error);
    return { success: false, error: error.message };
  }
}

export async function completeInstallation(
  installationId: string,
  sessionId: string,
  data: {
    actualCompletionDate: string;
    commissioningDate?: string;
    gridConnectionDate?: string;
    notes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('installations')
      .update({
        status: 'completed',
        actual_completion_date: data.actualCompletionDate,
        commissioning_date: data.commissioningDate,
        grid_connection_date: data.gridConnectionDate,
        notes: data.notes,
      })
      .eq('id', installationId);

    if (error) throw error;

    // Update workflow stage
    await updateWorkflowStage(sessionId, 'installation_completed');

    return { success: true };
  } catch (error: any) {
    console.error('Error completing installation:', error);
    return { success: false, error: error.message };
  }
}

export async function getInstallation(sessionId: string): Promise<Installation | null> {
  try {
    const { data, error } = await supabase
      .from('installations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return dbToInstallation(data);
  } catch (error) {
    console.error('Error getting installation:', error);
    return null;
  }
}

// System Components Management
export async function createSystemComponent(
  sessionId: string,
  installationId: string,
  data: Partial<SystemComponent>
): Promise<{ success: boolean; component?: SystemComponent; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('system_components')
      .insert({
        session_id: sessionId,
        installation_id: installationId,
        component_type: data.componentType,
        model: data.model,
        serial_number: data.serialNumber,
        manufacturer: data.manufacturer,
        installed_date: data.installedDate,
        warranty_expiry: data.warrantyExpiry,
        expected_lifespan_years: data.expectedLifespanYears,
        status: 'operational',
        health_percentage: 100,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, component: dbToSystemComponent(result) };
  } catch (error: any) {
    console.error('Error creating system component:', error);
    return { success: false, error: error.message };
  }
}

export async function updateSystemComponent(
  componentId: string,
  data: Partial<SystemComponent>
): Promise<{ success: boolean; component?: SystemComponent; error?: string }> {
  try {
    const updateData: any = {};
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.healthPercentage !== undefined) updateData.health_percentage = data.healthPercentage;
    if (data.currentOutputKw !== undefined) updateData.current_output_kw = data.currentOutputKw;
    if (data.dailyOutputKwh !== undefined) updateData.daily_output_kwh = data.dailyOutputKwh;
    if (data.lifetimeOutputKwh !== undefined) updateData.lifetime_output_kwh = data.lifetimeOutputKwh;
    if (data.lastReadingAt !== undefined) updateData.last_reading_at = data.lastReadingAt;

    const { data: result, error } = await supabase
      .from('system_components')
      .update(updateData)
      .eq('id', componentId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, component: dbToSystemComponent(result) };
  } catch (error: any) {
    console.error('Error updating system component:', error);
    return { success: false, error: error.message };
  }
}

export async function getSystemComponents(sessionId: string): Promise<SystemComponent[]> {
  try {
    const { data, error } = await supabase
      .from('system_components')
      .select('*')
      .eq('session_id', sessionId)
      .order('component_type');

    if (error) throw error;
    return (data || []).map(dbToSystemComponent);
  } catch (error) {
    console.error('Error getting system components:', error);
    return [];
  }
}

// Maintenance Alerts Management
export async function createMaintenanceAlert(
  sessionId: string,
  data: Partial<MaintenanceAlert>
): Promise<{ success: boolean; alert?: MaintenanceAlert; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('maintenance_alerts')
      .insert({
        session_id: sessionId,
        component_id: data.componentId,
        installation_id: data.installationId,
        alert_type: data.alertType,
        severity: data.severity,
        title: data.title,
        description: data.description,
        error_code: data.errorCode,
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: dbToMaintenanceAlert(result) };
  } catch (error: any) {
    console.error('Error creating maintenance alert:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMaintenanceAlert(
  alertId: string,
  data: Partial<MaintenanceAlert>
): Promise<{ success: boolean; alert?: MaintenanceAlert; error?: string }> {
  try {
    const updateData: any = {};
    
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
    if (data.resolutionNotes !== undefined) updateData.resolution_notes = data.resolutionNotes;
    if (data.scheduledServiceDate !== undefined) updateData.scheduled_service_date = data.scheduledServiceDate;
    
    if (data.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = data.resolvedBy;
    }

    const { data: result, error } = await supabase
      .from('maintenance_alerts')
      .update(updateData)
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, alert: dbToMaintenanceAlert(result) };
  } catch (error: any) {
    console.error('Error updating maintenance alert:', error);
    return { success: false, error: error.message };
  }
}

export async function getMaintenanceAlerts(
  sessionId: string,
  options?: { status?: AlertStatus; limit?: number }
): Promise<MaintenanceAlert[]> {
  try {
    let query = supabase
      .from('maintenance_alerts')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(dbToMaintenanceAlert);
  } catch (error) {
    console.error('Error getting maintenance alerts:', error);
    return [];
  }
}

export async function getAllOpenAlerts(limit: number = 50): Promise<MaintenanceAlert[]> {
  try {
    const { data, error } = await supabase
      .from('maintenance_alerts')
      .select('*')
      .in('status', ['open', 'acknowledged', 'in_progress'])
      .order('severity')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(dbToMaintenanceAlert);
  } catch (error) {
    console.error('Error getting all open alerts:', error);
    return [];
  }
}

// Maintenance Tasks Management
export async function createMaintenanceTask(
  sessionId: string,
  data: Partial<MaintenanceTask>
): Promise<{ success: boolean; task?: MaintenanceTask; error?: string }> {
  try {
    const { data: result, error } = await supabase
      .from('maintenance_tasks')
      .insert({
        session_id: sessionId,
        alert_id: data.alertId,
        task_type: data.taskType,
        title: data.title,
        description: data.description,
        scheduled_date: data.scheduledDate,
        scheduled_time: data.scheduledTime,
        estimated_duration_hours: data.estimatedDurationHours,
        assigned_technician: data.assignedTechnician,
        technician_phone: data.technicianPhone,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, task: dbToMaintenanceTask(result) };
  } catch (error: any) {
    console.error('Error creating maintenance task:', error);
    return { success: false, error: error.message };
  }
}

export async function updateMaintenanceTask(
  taskId: string,
  data: Partial<MaintenanceTask>
): Promise<{ success: boolean; task?: MaintenanceTask; error?: string }> {
  try {
    const updateData: any = {};
    
    if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
    if (data.scheduledTime !== undefined) updateData.scheduled_time = data.scheduledTime;
    if (data.assignedTechnician !== undefined) updateData.assigned_technician = data.assignedTechnician;
    if (data.technicianPhone !== undefined) updateData.technician_phone = data.technicianPhone;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.completionNotes !== undefined) updateData.completion_notes = data.completionNotes;
    if (data.partsUsed !== undefined) updateData.parts_used = data.partsUsed;
    if (data.laborHours !== undefined) updateData.labor_hours = data.laborHours;
    if (data.totalCost !== undefined) updateData.total_cost = data.totalCost;
    
    if (data.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data: result, error } = await supabase
      .from('maintenance_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, task: dbToMaintenanceTask(result) };
  } catch (error: any) {
    console.error('Error updating maintenance task:', error);
    return { success: false, error: error.message };
  }
}

export async function getMaintenanceTasks(
  sessionId: string,
  options?: { status?: TaskStatus; limit?: number }
): Promise<MaintenanceTask[]> {
  try {
    let query = supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('session_id', sessionId)
      .order('scheduled_date', { ascending: true });

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(dbToMaintenanceTask);
  } catch (error) {
    console.error('Error getting maintenance tasks:', error);
    return [];
  }
}

// Get full workflow data for a session
export async function getFullWorkflowData(sessionId: string): Promise<{
  stage: WorkflowStage;
  inspection: SiteInspection | null;
  installation: Installation | null;
  components: SystemComponent[];
  alerts: MaintenanceAlert[];
  tasks: MaintenanceTask[];
}> {
  const [stage, inspection, installation, components, alerts, tasks] = await Promise.all([
    getWorkflowStage(sessionId),
    getSiteInspection(sessionId),
    getInstallation(sessionId),
    getSystemComponents(sessionId),
    getMaintenanceAlerts(sessionId),
    getMaintenanceTasks(sessionId),
  ]);

  return {
    stage: stage || 'bill_analysis',
    inspection,
    installation,
    components,
    alerts,
    tasks,
  };
}

// Transition to maintenance mode
export async function transitionToMaintenance(
  sessionId: string,
  installationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Update workflow stage
    await updateWorkflowStage(sessionId, 'maintenance');

    // Get installation details to create components
    const installation = await getInstallation(sessionId);
    
    if (installation) {
      const today = new Date().toISOString().split('T')[0];
      const warrantyExpiry = new Date();
      warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + 10);
      const warrantyDate = warrantyExpiry.toISOString().split('T')[0];

      // Create system components based on installation
      const components = [];
      
      if (installation.solarSystemSizeKw) {
        components.push({
          componentType: 'solar_panel' as const,
          model: installation.solarPanelModel,
          installedDate: today,
          warrantyExpiry: warrantyDate,
          expectedLifespanYears: 25,
        });
      }
      
      if (installation.inverterSizeKw) {
        components.push({
          componentType: 'inverter' as const,
          model: installation.inverterModel,
          installedDate: today,
          warrantyExpiry: warrantyDate,
          expectedLifespanYears: 15,
        });
      }
      
      if (installation.batteryCapacityKwh) {
        components.push({
          componentType: 'battery' as const,
          model: installation.batteryModel,
          installedDate: today,
          warrantyExpiry: warrantyDate,
          expectedLifespanYears: 10,
        });
      }

      // Create all components
      for (const comp of components) {
        await createSystemComponent(sessionId, installationId, comp);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error transitioning to maintenance:', error);
    return { success: false, error: error.message };
  }
}
