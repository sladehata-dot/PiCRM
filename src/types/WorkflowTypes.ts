// Workflow Stage Types
export type WorkflowStage = 
  | 'bill_analysis'
  | 'proposal_sent'
  | 'proposal_accepted'
  | 'site_inspection_scheduled'
  | 'site_inspection_completed'
  | 'infrastructure_review'
  | 'installation_scheduled'
  | 'installation_in_progress'
  | 'installation_completed'
  | 'maintenance';

export const WORKFLOW_STAGES: { stage: WorkflowStage; label: string; description: string }[] = [
  { stage: 'bill_analysis', label: 'Bill Analysis', description: 'Energy bill analyzed and savings calculated' },
  { stage: 'proposal_sent', label: 'Proposal Sent', description: 'Quote sent to customer for review' },
  { stage: 'proposal_accepted', label: 'Proposal Accepted', description: 'Customer accepted, pending site inspection' },
  { stage: 'site_inspection_scheduled', label: 'Inspection Scheduled', description: 'Site inspection date confirmed' },
  { stage: 'site_inspection_completed', label: 'Inspection Complete', description: 'Site inspection finished' },
  { stage: 'infrastructure_review', label: 'Infrastructure Review', description: 'Reviewing required upgrades' },
  { stage: 'installation_scheduled', label: 'Installation Scheduled', description: 'Installation date confirmed' },
  { stage: 'installation_in_progress', label: 'Installing', description: 'Installation in progress' },
  { stage: 'installation_completed', label: 'Installed', description: 'System installed and commissioned' },
  { stage: 'maintenance', label: 'Maintenance', description: 'Active system monitoring' },
];

// Site Inspection Types
export type RoofCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair';
export type ShadingAssessment = 'none' | 'minimal' | 'moderate' | 'significant';
export type SwitchboardCondition = 'excellent' | 'good' | 'fair' | 'poor' | 'needs_upgrade';
export type InspectionStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface SiteInspection {
  id: string;
  sessionId: string;
  scheduledDate: string;
  scheduledTime: string;
  inspectorName: string;
  inspectorPhone?: string;
  status: InspectionStatus;
  
  // Site details
  roofType?: string;
  roofCondition?: RoofCondition;
  roofOrientation?: string;
  roofAngleDegrees?: number;
  shadingAssessment?: ShadingAssessment;
  availableRoofSpaceSqm?: number;
  
  // Electrical assessment
  switchboardCondition?: SwitchboardCondition;
  currentPhases?: number;
  meterType?: string;
  
  // Infrastructure requirements
  requiresRoofRepairs: boolean;
  requiresSwitchboardUpgrade: boolean;
  requiresMeterUpgrade: boolean;
  requiresStructuralWork: boolean;
  
  // Costs
  estimatedUpgradeCost: number;
  
  // Notes
  notes?: string;
  photos: string[];
  
  // Recommendations
  recommendedSystemSizeKw?: number;
  recommendedBatteryKwh?: number;
  recommendedInverterKw?: number;
  
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Installation Types
export type InstallationStatus = 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

export interface Installation {
  id: string;
  sessionId: string;
  inspectionId?: string;
  
  // Scheduling
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDurationHours: number;
  
  // Team
  leadInstaller?: string;
  installerTeam: string[];
  
  // Status
  status: InstallationStatus;
  
  // System installed
  solarPanelsCount?: number;
  solarPanelModel?: string;
  solarSystemSizeKw?: number;
  inverterModel?: string;
  inverterSizeKw?: number;
  batteryModel?: string;
  batteryCapacityKwh?: number;
  
  // Completion details
  actualCompletionDate?: string;
  commissioningDate?: string;
  gridConnectionDate?: string;
  
  // Documentation
  installationPhotos: string[];
  complianceCertificates: string[];
  warrantyInfo: Record<string, any>;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// System Component Types
export type ComponentType = 'solar_panel' | 'inverter' | 'battery' | 'meter' | 'wiring' | 'mounting';
export type ComponentStatus = 'operational' | 'degraded' | 'faulty' | 'offline' | 'replaced';

export interface SystemComponent {
  id: string;
  sessionId: string;
  installationId?: string;
  
  componentType: ComponentType;
  model?: string;
  serialNumber?: string;
  manufacturer?: string;
  
  // Installation info
  installedDate?: string;
  warrantyExpiry?: string;
  expectedLifespanYears?: number;
  
  // Status
  status: ComponentStatus;
  healthPercentage: number;
  
  // Performance metrics
  lastReadingAt?: string;
  currentOutputKw?: number;
  dailyOutputKwh?: number;
  lifetimeOutputKwh?: number;
  
  createdAt: string;
  updatedAt: string;
}

// Maintenance Alert Types
export type AlertType = 'error' | 'warning' | 'flag' | 'info' | 'maintenance_due';
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';

export interface MaintenanceAlert {
  id: string;
  sessionId: string;
  componentId?: string;
  installationId?: string;
  
  alertType: AlertType;
  severity: AlertSeverity;
  
  title: string;
  description?: string;
  errorCode?: string;
  
  status: AlertStatus;
  
  // Resolution
  assignedTo?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  
  // Scheduling
  scheduledServiceDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

// Maintenance Task Types
export type TaskType = 'inspection' | 'cleaning' | 'repair' | 'replacement' | 'upgrade' | 'troubleshooting';
export type TaskStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';

export interface MaintenanceTask {
  id: string;
  sessionId: string;
  alertId?: string;
  
  taskType: TaskType;
  title: string;
  description?: string;
  
  // Scheduling
  scheduledDate: string;
  scheduledTime?: string;
  estimatedDurationHours?: number;
  
  // Assignment
  assignedTechnician?: string;
  technicianPhone?: string;
  
  // Status
  status: TaskStatus;
  
  // Completion
  completedAt?: string;
  completionNotes?: string;
  partsUsed: { name: string; quantity: number; cost: number }[];
  laborHours?: number;
  totalCost?: number;
  
  createdAt: string;
  updatedAt: string;
}

// Proposal Types
export interface ProposalData {
  systemSizeKw: number;
  batteryCapacityKwh?: number;
  estimatedCost: number;
  estimatedSavingsPerYear: number;
  paybackPeriodYears: number;
  financingOptions?: {
    type: string;
    monthlyPayment: number;
    term: number;
    interestRate: number;
  }[];
  validUntil: string;
  termsAccepted?: boolean;
  acceptedAt?: string;
  customerSignature?: string;
}

// Helper functions
export function getStageIndex(stage: WorkflowStage): number {
  return WORKFLOW_STAGES.findIndex(s => s.stage === stage);
}

export function getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
  const index = getStageIndex(currentStage);
  if (index < WORKFLOW_STAGES.length - 1) {
    return WORKFLOW_STAGES[index + 1].stage;
  }
  return null;
}

export function getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
  const index = getStageIndex(currentStage);
  if (index > 0) {
    return WORKFLOW_STAGES[index - 1].stage;
  }
  return null;
}

export function isStageComplete(currentStage: WorkflowStage, checkStage: WorkflowStage): boolean {
  return getStageIndex(currentStage) > getStageIndex(checkStage);
}

export function isStageActive(currentStage: WorkflowStage, checkStage: WorkflowStage): boolean {
  return currentStage === checkStage;
}

export function getStageLabel(stage: WorkflowStage): string {
  const found = WORKFLOW_STAGES.find(s => s.stage === stage);
  return found?.label || stage;
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical': return 'red';
    case 'high': return 'orange';
    case 'medium': return 'amber';
    case 'low': return 'blue';
    default: return 'slate';
  }
}

export function getComponentTypeLabel(type: ComponentType): string {
  switch (type) {
    case 'solar_panel': return 'Solar Panels';
    case 'inverter': return 'Inverter';
    case 'battery': return 'Battery';
    case 'meter': return 'Smart Meter';
    case 'wiring': return 'Wiring';
    case 'mounting': return 'Mounting System';
    default: return type;
  }
}

export function getStatusColor(status: ComponentStatus): string {
  switch (status) {
    case 'operational': return 'emerald';
    case 'degraded': return 'amber';
    case 'faulty': return 'red';
    case 'offline': return 'slate';
    case 'replaced': return 'blue';
    default: return 'slate';
  }
}
