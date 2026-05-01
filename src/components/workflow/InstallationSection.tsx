import React, { useState, useEffect } from 'react';
import { 
  Wrench, Calendar, User, Users, Clock, 
  Check, Sun, Battery, Zap, ChevronDown, ChevronUp, Save
} from 'lucide-react';
import { Installation, SiteInspection } from '@/types/WorkflowTypes';
import { 
  createInstallation, 
  updateInstallation, 
  completeInstallation,
  getInstallation,
  transitionToMaintenance
} from '@/lib/workflowService';

interface InstallationSectionProps {
  sessionId: string;
  inspection?: SiteInspection | null;
  onInstallationScheduled?: () => void;
  onInstallationCompleted?: () => void;
}

const InstallationSection: React.FC<InstallationSectionProps> = ({
  sessionId,
  inspection,
  onInstallationScheduled,
  onInstallationCompleted,
}) => {
  const [installation, setInstallation] = useState<Installation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '08:00',
    estimatedDurationHours: 8,
    leadInstaller: '',
    installerTeam: [] as string[],
    solarPanelsCount: 20,
    solarPanelModel: '',
    solarSystemSizeKw: inspection?.recommendedSystemSizeKw || 6.6,
    inverterModel: '',
    inverterSizeKw: inspection?.recommendedInverterKw || 5,
    batteryModel: '',
    batteryCapacityKwh: inspection?.recommendedBatteryKwh || 10,
    notes: '',
    actualCompletionDate: '',
    commissioningDate: '',
    gridConnectionDate: '',
  });

  const [newTeamMember, setNewTeamMember] = useState('');

  useEffect(() => {
    loadInstallation();
  }, [sessionId]);

  useEffect(() => {
    if (inspection) {
      setFormData(prev => ({
        ...prev,
        solarSystemSizeKw: inspection.recommendedSystemSizeKw || prev.solarSystemSizeKw,
        inverterSizeKw: inspection.recommendedInverterKw || prev.inverterSizeKw,
        batteryCapacityKwh: inspection.recommendedBatteryKwh || prev.batteryCapacityKwh,
      }));
    }
  }, [inspection]);

  const loadInstallation = async () => {
    setIsLoading(true);
    const data = await getInstallation(sessionId);
    if (data) {
      setInstallation(data);
      setFormData({
        scheduledDate: data.scheduledDate || '',
        scheduledTime: data.scheduledTime || '08:00',
        estimatedDurationHours: data.estimatedDurationHours,
        leadInstaller: data.leadInstaller || '',
        installerTeam: data.installerTeam || [],
        solarPanelsCount: data.solarPanelsCount || 20,
        solarPanelModel: data.solarPanelModel || '',
        solarSystemSizeKw: data.solarSystemSizeKw || 6.6,
        inverterModel: data.inverterModel || '',
        inverterSizeKw: data.inverterSizeKw || 5,
        batteryModel: data.batteryModel || '',
        batteryCapacityKwh: data.batteryCapacityKwh || 10,
        notes: data.notes || '',
        actualCompletionDate: data.actualCompletionDate || '',
        commissioningDate: data.commissioningDate || '',
        gridConnectionDate: data.gridConnectionDate || '',
      });
    }
    setIsLoading(false);
  };

  const handleScheduleInstallation = async () => {
    if (!formData.scheduledDate || !formData.leadInstaller) return;
    
    setIsSaving(true);
    const result = await createInstallation(sessionId, {
      inspectionId: inspection?.id,
      scheduledDate: formData.scheduledDate,
      scheduledTime: formData.scheduledTime,
      estimatedDurationHours: formData.estimatedDurationHours,
      leadInstaller: formData.leadInstaller,
      installerTeam: formData.installerTeam,
      solarPanelsCount: formData.solarPanelsCount,
      solarPanelModel: formData.solarPanelModel,
      solarSystemSizeKw: formData.solarSystemSizeKw,
      inverterModel: formData.inverterModel,
      inverterSizeKw: formData.inverterSizeKw,
      batteryModel: formData.batteryModel,
      batteryCapacityKwh: formData.batteryCapacityKwh,
    });
    
    if (result.success && result.installation) {
      setInstallation(result.installation);
      onInstallationScheduled?.();
    }
    setIsSaving(false);
  };

  const handleSaveInstallation = async () => {
    if (!installation) return;
    
    setIsSaving(true);
    const result = await updateInstallation(installation.id, formData as any);
    
    if (result.success && result.installation) {
      setInstallation(result.installation);
    }
    setIsSaving(false);
  };

  const handleCompleteInstallation = async () => {
    if (!installation || !formData.actualCompletionDate) return;
    
    setIsSaving(true);
    const result = await completeInstallation(installation.id, sessionId, {
      actualCompletionDate: formData.actualCompletionDate,
      commissioningDate: formData.commissioningDate,
      gridConnectionDate: formData.gridConnectionDate,
      notes: formData.notes,
    });
    
    if (result.success) {
      // Transition to maintenance mode
      await transitionToMaintenance(sessionId, installation.id);
      await loadInstallation();
      onInstallationCompleted?.();
    }
    setIsSaving(false);
  };

  const addTeamMember = () => {
    if (newTeamMember.trim()) {
      setFormData({
        ...formData,
        installerTeam: [...formData.installerTeam, newTeamMember.trim()],
      });
      setNewTeamMember('');
    }
  };

  const removeTeamMember = (index: number) => {
    setFormData({
      ...formData,
      installerTeam: formData.installerTeam.filter((_, i) => i !== index),
    });
  };

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
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Wrench className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Installation</h3>
            <p className="text-sm text-slate-400">
              {installation?.status === 'completed' 
                ? 'Installation completed' 
                : installation 
                ? `Scheduled for ${installation.scheduledDate}` 
                : 'Schedule installation'}
            </p>
          </div>
        </div>
        {installation?.status === 'completed' && (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm rounded-full">
            Completed
          </span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Schedule Form */}
        {!installation && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Date</label>
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
              <div>
                <label className="block text-sm text-slate-400 mb-1">Duration (hrs)</label>
                <input
                  type="number"
                  value={formData.estimatedDurationHours}
                  onChange={(e) => setFormData({ ...formData, estimatedDurationHours: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">Lead Installer</label>
              <input
                type="text"
                value={formData.leadInstaller}
                onChange={(e) => setFormData({ ...formData, leadInstaller: e.target.value })}
                placeholder="John Smith"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleScheduleInstallation}
              disabled={isSaving || !formData.scheduledDate || !formData.leadInstaller}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Installation</span>
            </button>
          </>
        )}

        {/* Scheduled/Completed Installation */}
        {installation && (
          <>
            {/* Schedule Info */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">{installation.scheduledDate}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">{installation.scheduledTime || '08:00'}</span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-white">{installation.leadInstaller}</span>
              </div>
            </div>

            {/* Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-white">Installation Details</span>
              {showDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showDetails && (
              <div className="space-y-4 pt-2">
                {/* Team */}
                <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    Installation Team
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {formData.installerTeam.map((member, index) => (
                      <span 
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-sm text-white"
                      >
                        {member}
                        {installation.status !== 'completed' && (
                          <button 
                            onClick={() => removeTeamMember(index)}
                            className="ml-1 text-slate-400 hover:text-red-400"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  {installation.status !== 'completed' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTeamMember}
                        onChange={(e) => setNewTeamMember(e.target.value)}
                        placeholder="Add team member"
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        onKeyPress={(e) => e.key === 'Enter' && addTeamMember()}
                      />
                      <button
                        onClick={addTeamMember}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* System Details */}
                <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    System Configuration
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Panel Count</label>
                      <input
                        type="number"
                        value={formData.solarPanelsCount}
                        onChange={(e) => setFormData({ ...formData, solarPanelsCount: parseInt(e.target.value) })}
                        disabled={installation.status === 'completed'}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Panel Model</label>
                      <input
                        type="text"
                        value={formData.solarPanelModel}
                        onChange={(e) => setFormData({ ...formData, solarPanelModel: e.target.value })}
                        disabled={installation.status === 'completed'}
                        placeholder="e.g., Jinko 440W"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">System Size (kW)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.solarSystemSizeKw}
                        onChange={(e) => setFormData({ ...formData, solarSystemSizeKw: parseFloat(e.target.value) })}
                        disabled={installation.status === 'completed'}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Inverter Model</label>
                      <input
                        type="text"
                        value={formData.inverterModel}
                        onChange={(e) => setFormData({ ...formData, inverterModel: e.target.value })}
                        disabled={installation.status === 'completed'}
                        placeholder="e.g., Fronius Primo 5.0"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Battery */}
                <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <Battery className="w-4 h-4 text-emerald-400" />
                    Battery System
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Battery Model</label>
                      <input
                        type="text"
                        value={formData.batteryModel}
                        onChange={(e) => setFormData({ ...formData, batteryModel: e.target.value })}
                        disabled={installation.status === 'completed'}
                        placeholder="e.g., Tesla Powerwall 2"
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Capacity (kWh)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.batteryCapacityKwh}
                        onChange={(e) => setFormData({ ...formData, batteryCapacityKwh: parseFloat(e.target.value) })}
                        disabled={installation.status === 'completed'}
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Completion Details */}
                {installation.status !== 'completed' && (
                  <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-white flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      Completion Details
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Completion Date</label>
                        <input
                          type="date"
                          value={formData.actualCompletionDate}
                          onChange={(e) => setFormData({ ...formData, actualCompletionDate: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Commissioning Date</label>
                        <input
                          type="date"
                          value={formData.commissioningDate}
                          onChange={(e) => setFormData({ ...formData, commissioningDate: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Grid Connection</label>
                        <input
                          type="date"
                          value={formData.gridConnectionDate}
                          onChange={(e) => setFormData({ ...formData, gridConnectionDate: e.target.value })}
                          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Installation Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    disabled={installation.status === 'completed'}
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none disabled:opacity-50"
                  />
                </div>

                {/* Action Buttons */}
                {installation.status !== 'completed' && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveInstallation}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Progress</span>
                    </button>
                    <button
                      onClick={handleCompleteInstallation}
                      disabled={isSaving || !formData.actualCompletionDate}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      <span>Complete Installation</span>
                    </button>
                  </div>
                )}

                {/* Completed Info */}
                {installation.status === 'completed' && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      Installed on {installation.actualCompletionDate}
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default InstallationSection;
