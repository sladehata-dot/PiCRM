import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Calendar, User, Phone, MapPin, 
  Check, AlertTriangle, Wrench, Zap, Sun, Battery,
  ChevronDown, ChevronUp, Save, Edit2
} from 'lucide-react';
import { 
  SiteInspection, 
  RoofCondition, 
  ShadingAssessment, 
  SwitchboardCondition 
} from '@/types/WorkflowTypes';
import { 
  createSiteInspection, 
  updateSiteInspection, 
  completeSiteInspection,
  getSiteInspection 
} from '@/lib/workflowService';

interface SiteInspectionSectionProps {
  sessionId: string;
  customerAddress?: string;
  onInspectionScheduled?: () => void;
  onInspectionCompleted?: () => void;
}

const SiteInspectionSection: React.FC<SiteInspectionSectionProps> = ({
  sessionId,
  customerAddress,
  onInspectionScheduled,
  onInspectionCompleted,
}) => {
  const [inspection, setInspection] = useState<SiteInspection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(true); // Default to showing details
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '09:00',
    inspectorName: '',
    inspectorPhone: '',
    roofType: '',
    roofCondition: '' as RoofCondition | '',
    roofOrientation: '',
    roofAngleDegrees: 20,
    shadingAssessment: '' as ShadingAssessment | '',
    availableRoofSpaceSqm: 0,
    switchboardCondition: '' as SwitchboardCondition | '',
    currentPhases: 1,
    meterType: '',
    requiresRoofRepairs: false,
    requiresSwitchboardUpgrade: false,
    requiresMeterUpgrade: false,
    requiresStructuralWork: false,
    estimatedUpgradeCost: 0,
    notes: '',
    recommendedSystemSizeKw: 6.6,
    recommendedBatteryKwh: 10,
    recommendedInverterKw: 5,
  });

  useEffect(() => {
    loadInspection();
  }, [sessionId]);

  const loadInspection = async () => {
    setIsLoading(true);
    const data = await getSiteInspection(sessionId);
    if (data) {
      setInspection(data);
      setFormData({
        scheduledDate: data.scheduledDate || '',
        scheduledTime: data.scheduledTime || '09:00',
        inspectorName: data.inspectorName || '',
        inspectorPhone: data.inspectorPhone || '',
        roofType: data.roofType || '',
        roofCondition: data.roofCondition || '',
        roofOrientation: data.roofOrientation || '',
        roofAngleDegrees: data.roofAngleDegrees || 20,
        shadingAssessment: data.shadingAssessment || '',
        availableRoofSpaceSqm: data.availableRoofSpaceSqm || 0,
        switchboardCondition: data.switchboardCondition || '',
        currentPhases: data.currentPhases || 1,
        meterType: data.meterType || '',
        requiresRoofRepairs: data.requiresRoofRepairs,
        requiresSwitchboardUpgrade: data.requiresSwitchboardUpgrade,
        requiresMeterUpgrade: data.requiresMeterUpgrade,
        requiresStructuralWork: data.requiresStructuralWork,
        estimatedUpgradeCost: data.estimatedUpgradeCost,
        notes: data.notes || '',
        recommendedSystemSizeKw: data.recommendedSystemSizeKw || 6.6,
        recommendedBatteryKwh: data.recommendedBatteryKwh || 10,
        recommendedInverterKw: data.recommendedInverterKw || 5,
      });
      // If inspection exists, don't auto-show edit mode
      setIsEditing(false);
    } else {
      // No inspection yet, show form in edit mode
      setIsEditing(true);
    }
    setIsLoading(false);
  };

  const handleScheduleInspection = async () => {
    if (!formData.scheduledDate || !formData.inspectorName) return;
    
    setIsSaving(true);
    const result = await createSiteInspection(sessionId, {
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      inspectorName: formData.inspectorName,
      inspectorPhone: formData.inspectorPhone,
    });
    
    if (result.success && result.inspection) {
      setInspection(result.inspection);
      onInspectionScheduled?.();
    }
    setIsSaving(false);
  };

  const handleSaveInspection = async () => {
    if (!inspection) return;
    
    setIsSaving(true);
    const result = await updateSiteInspection(inspection.id, formData as any);
    
    if (result.success && result.inspection) {
      setInspection(result.inspection);
      setIsEditing(false);
    }
    setIsSaving(false);
  };

  const handleCompleteInspection = async () => {
    if (!inspection) return;
    
    setIsSaving(true);
    const result = await completeSiteInspection(inspection.id, sessionId, formData as any);
    
    if (result.success) {
      await loadInspection();
      onInspectionCompleted?.();
    }
    setIsSaving(false);
  };

  const hasUpgrades = formData.requiresRoofRepairs || 
    formData.requiresSwitchboardUpgrade || 
    formData.requiresMeterUpgrade || 
    formData.requiresStructuralWork;

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Site Inspection Form</h3>
            <p className="text-sm text-slate-400">
              {inspection?.status === 'completed' 
                ? 'Inspection completed' 
                : inspection 
                ? `Scheduled for ${inspection.scheduledDate}` 
                : 'Schedule and complete site inspection'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {inspection?.status === 'completed' && (
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
              Completed
            </span>
          )}
          {inspection && inspection.status !== 'completed' && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 text-sm rounded-full hover:bg-cyan-500/30 transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Customer Address */}
        {customerAddress && (
          <div className="flex items-start gap-2 p-3 bg-slate-700/50 rounded-lg">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
            <span className="text-sm text-slate-300">{customerAddress}</span>
          </div>
        )}

        {/* Toggle Details Button */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <span className="text-sm font-medium text-white">
            {showDetails ? 'Hide Form Details' : 'Show Form Details'}
          </span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {showDetails && (
          <div className="space-y-4 pt-2">
            {/* Schedule Info - Always editable if no inspection or in edit mode */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Schedule & Inspector
              </h4>
              
              {(!inspection || isEditing) ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Date *</label>
                      <input
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Time</label>
                      <input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Inspector Name *</label>
                      <input
                        type="text"
                        value={formData.inspectorName}
                        onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                        placeholder="John Smith"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Inspector Phone</label>
                      <input
                        type="tel"
                        value={formData.inspectorPhone}
                        onChange={(e) => setFormData({ ...formData, inspectorPhone: e.target.value })}
                        placeholder="0400 000 000"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{inspection.inspectorName}</span>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{inspection.scheduledDate} at {inspection.scheduledTime}</span>
                  </div>
                  {inspection.inspectorPhone && (
                    <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-white">{inspection.inspectorPhone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Roof Assessment */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Roof Assessment
              </h4>
              
              {(!inspection || isEditing || inspection.status !== 'completed') ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Roof Type</label>
                    <input
                      type="text"
                      value={formData.roofType}
                      onChange={(e) => setFormData({ ...formData, roofType: e.target.value })}
                      placeholder="Tile, Metal, Colorbond, etc."
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Condition</label>
                    <select
                      value={formData.roofCondition}
                      onChange={(e) => setFormData({ ...formData, roofCondition: e.target.value as RoofCondition })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs_repair">Needs Repair</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Orientation</label>
                    <input
                      type="text"
                      value={formData.roofOrientation}
                      onChange={(e) => setFormData({ ...formData, roofOrientation: e.target.value })}
                      placeholder="North, North-West, etc."
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Angle (degrees)</label>
                    <input
                      type="number"
                      value={formData.roofAngleDegrees}
                      onChange={(e) => setFormData({ ...formData, roofAngleDegrees: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Shading</label>
                    <select
                      value={formData.shadingAssessment}
                      onChange={(e) => setFormData({ ...formData, shadingAssessment: e.target.value as ShadingAssessment })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="none">None</option>
                      <option value="minimal">Minimal</option>
                      <option value="moderate">Moderate</option>
                      <option value="significant">Significant</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Available Space (m²)</label>
                    <input
                      type="number"
                      value={formData.availableRoofSpaceSqm}
                      onChange={(e) => setFormData({ ...formData, availableRoofSpaceSqm: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Type:</span> <span className="text-white">{formData.roofType || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Condition:</span> <span className="text-white capitalize">{formData.roofCondition || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Orientation:</span> <span className="text-white">{formData.roofOrientation || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Angle:</span> <span className="text-white">{formData.roofAngleDegrees}°</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Shading:</span> <span className="text-white capitalize">{formData.shadingAssessment || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Space:</span> <span className="text-white">{formData.availableRoofSpaceSqm} m²</span>
                  </div>
                </div>
              )}
            </div>

            {/* Electrical Assessment */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                Electrical Assessment
              </h4>
              
              {(!inspection || isEditing || inspection.status !== 'completed') ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Switchboard</label>
                    <select
                      value={formData.switchboardCondition}
                      onChange={(e) => setFormData({ ...formData, switchboardCondition: e.target.value as SwitchboardCondition })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="excellent">Excellent</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="needs_upgrade">Needs Upgrade</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phases</label>
                    <select
                      value={formData.currentPhases}
                      onChange={(e) => setFormData({ ...formData, currentPhases: parseInt(e.target.value) })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value={1}>Single Phase</option>
                      <option value={3}>Three Phase</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Meter Type</label>
                    <input
                      type="text"
                      value={formData.meterType}
                      onChange={(e) => setFormData({ ...formData, meterType: e.target.value })}
                      placeholder="Smart, Basic, etc."
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Switchboard:</span> <span className="text-white capitalize">{formData.switchboardCondition || 'N/A'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Phases:</span> <span className="text-white">{formData.currentPhases === 3 ? 'Three Phase' : 'Single Phase'}</span>
                  </div>
                  <div className="p-2 bg-slate-700/50 rounded">
                    <span className="text-slate-400">Meter:</span> <span className="text-white">{formData.meterType || 'N/A'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Infrastructure Requirements */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-orange-400" />
                Infrastructure Upgrades Required
              </h4>
              
              {(!inspection || isEditing || inspection.status !== 'completed') ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.requiresRoofRepairs}
                        onChange={(e) => setFormData({ ...formData, requiresRoofRepairs: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">Roof Repairs</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.requiresSwitchboardUpgrade}
                        onChange={(e) => setFormData({ ...formData, requiresSwitchboardUpgrade: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">Switchboard Upgrade</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.requiresMeterUpgrade}
                        onChange={(e) => setFormData({ ...formData, requiresMeterUpgrade: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">Meter Upgrade</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.requiresStructuralWork}
                        onChange={(e) => setFormData({ ...formData, requiresStructuralWork: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500"
                      />
                      <span className="text-sm text-slate-300">Structural Work</span>
                    </label>
                  </div>
                  {hasUpgrades && (
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Estimated Upgrade Cost ($)</label>
                      <input
                        type="number"
                        value={formData.estimatedUpgradeCost}
                        onChange={(e) => setFormData({ ...formData, estimatedUpgradeCost: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className={`p-2 rounded ${formData.requiresRoofRepairs ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/50 text-slate-400'}`}>
                      Roof Repairs: {formData.requiresRoofRepairs ? 'Yes' : 'No'}
                    </div>
                    <div className={`p-2 rounded ${formData.requiresSwitchboardUpgrade ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/50 text-slate-400'}`}>
                      Switchboard: {formData.requiresSwitchboardUpgrade ? 'Yes' : 'No'}
                    </div>
                    <div className={`p-2 rounded ${formData.requiresMeterUpgrade ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/50 text-slate-400'}`}>
                      Meter Upgrade: {formData.requiresMeterUpgrade ? 'Yes' : 'No'}
                    </div>
                    <div className={`p-2 rounded ${formData.requiresStructuralWork ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-700/50 text-slate-400'}`}>
                      Structural: {formData.requiresStructuralWork ? 'Yes' : 'No'}
                    </div>
                  </div>
                  {hasUpgrades && (
                    <div className="p-2 bg-orange-500/10 border border-orange-500/30 rounded text-sm">
                      <span className="text-orange-400">Estimated Cost:</span> <span className="text-white">${formData.estimatedUpgradeCost.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white flex items-center gap-2">
                <Battery className="w-4 h-4 text-emerald-400" />
                System Recommendations
              </h4>
              
              {(!inspection || isEditing || inspection.status !== 'completed') ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Solar (kW)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.recommendedSystemSizeKw}
                      onChange={(e) => setFormData({ ...formData, recommendedSystemSizeKw: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Battery (kWh)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.recommendedBatteryKwh}
                      onChange={(e) => setFormData({ ...formData, recommendedBatteryKwh: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Inverter (kW)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={formData.recommendedInverterKw}
                      onChange={(e) => setFormData({ ...formData, recommendedInverterKw: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded text-center">
                    <div className="text-emerald-400 font-semibold text-lg">{formData.recommendedSystemSizeKw} kW</div>
                    <div className="text-slate-400 text-xs">Solar System</div>
                  </div>
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded text-center">
                    <div className="text-cyan-400 font-semibold text-lg">{formData.recommendedBatteryKwh} kWh</div>
                    <div className="text-slate-400 text-xs">Battery</div>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded text-center">
                    <div className="text-amber-400 font-semibold text-lg">{formData.recommendedInverterKw} kW</div>
                    <div className="text-slate-400 text-xs">Inverter</div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="border border-slate-700 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-white">Inspection Notes</h4>
              
              {(!inspection || isEditing || inspection.status !== 'completed') ? (
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional observations, access issues, special requirements..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                />
              ) : (
                <div className="p-3 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                  {formData.notes || 'No notes recorded'}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              {!inspection && (
                <button
                  onClick={handleScheduleInspection}
                  disabled={isSaving || !formData.scheduledDate || !formData.inspectorName}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{isSaving ? 'Scheduling...' : 'Schedule Inspection'}</span>
                </button>
              )}
              
              {inspection && inspection.status !== 'completed' && (
                <>
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          loadInspection(); // Reset form data
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveInspection}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleSaveInspection}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Progress</span>
                      </button>
                      <button
                        onClick={handleCompleteInspection}
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete Inspection</span>
                      </button>
                    </>
                  )}
                </>
              )}
              
              {inspection?.status === 'completed' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Inspection</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upgrade Warning - Show when collapsed and has upgrades */}
        {!showDetails && inspection?.status === 'completed' && hasUpgrades && (
          <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-400">Infrastructure Upgrades Required</p>
              <p className="text-xs text-slate-400 mt-1">
                Estimated cost: ${formData.estimatedUpgradeCost.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteInspectionSection;
