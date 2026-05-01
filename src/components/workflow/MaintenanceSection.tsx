import React, { useState, useEffect } from 'react';
import { 
  Activity, AlertTriangle, AlertCircle, Info, CheckCircle, 
  Wrench, Sun, Battery, Zap, Clock, User, Plus,
  ChevronDown, ChevronUp, RefreshCw, Calendar
} from 'lucide-react';
import { 
  SystemComponent, 
  MaintenanceAlert, 
  MaintenanceTask,
  AlertSeverity,
  AlertType,
  ComponentStatus,
  getComponentTypeLabel,
  getSeverityColor,
  getStatusColor
} from '@/types/WorkflowTypes';
import { 
  getSystemComponents, 
  getMaintenanceAlerts, 
  getMaintenanceTasks,
  createMaintenanceAlert,
  updateMaintenanceAlert,
  createMaintenanceTask,
  updateMaintenanceTask,
  updateSystemComponent
} from '@/lib/workflowService';

interface MaintenanceSectionProps {
  sessionId: string;
  installationId?: string;
}

const MaintenanceSection: React.FC<MaintenanceSectionProps> = ({
  sessionId,
  installationId,
}) => {
  const [components, setComponents] = useState<SystemComponent[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'tasks'>('overview');
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  // New alert form
  const [newAlert, setNewAlert] = useState({
    alertType: 'warning' as AlertType,
    severity: 'medium' as AlertSeverity,
    title: '',
    description: '',
    errorCode: '',
  });

  // New task form
  const [newTask, setNewTask] = useState({
    taskType: 'inspection' as any,
    title: '',
    description: '',
    scheduledDate: '',
    scheduledTime: '09:00',
    assignedTechnician: '',
    estimatedDurationHours: 2,
  });

  useEffect(() => {
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    setIsLoading(true);
    const [comps, alts, tsks] = await Promise.all([
      getSystemComponents(sessionId),
      getMaintenanceAlerts(sessionId),
      getMaintenanceTasks(sessionId),
    ]);
    setComponents(comps);
    setAlerts(alts);
    setTasks(tsks);
    setIsLoading(false);
  };

  const handleCreateAlert = async () => {
    if (!newAlert.title) return;
    
    await createMaintenanceAlert(sessionId, {
      ...newAlert,
      installationId,
    });
    
    setNewAlert({
      alertType: 'warning',
      severity: 'medium',
      title: '',
      description: '',
      errorCode: '',
    });
    setShowNewAlert(false);
    loadData();
  };

  const handleResolveAlert = async (alertId: string) => {
    await updateMaintenanceAlert(alertId, {
      status: 'resolved',
      resolvedBy: 'Staff',
    });
    loadData();
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.scheduledDate) return;
    
    await createMaintenanceTask(sessionId, newTask);
    
    setNewTask({
      taskType: 'inspection',
      title: '',
      description: '',
      scheduledDate: '',
      scheduledTime: '09:00',
      assignedTechnician: '',
      estimatedDurationHours: 2,
    });
    setShowNewTask(false);
    loadData();
  };

  const handleCompleteTask = async (taskId: string) => {
    await updateMaintenanceTask(taskId, {
      status: 'completed',
    });
    loadData();
  };

  const getComponentIcon = (type: string) => {
    switch (type) {
      case 'solar_panel': return <Sun className="w-5 h-5" />;
      case 'battery': return <Battery className="w-5 h-5" />;
      case 'inverter': return <Zap className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'flag': return <Info className="w-4 h-4" />;
      case 'maintenance_due': return <Wrench className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const severityColors: Record<AlertSeverity, string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const statusColors: Record<ComponentStatus, string> = {
    operational: 'text-emerald-400',
    degraded: 'text-amber-400',
    faulty: 'text-red-400',
    offline: 'text-slate-400',
    replaced: 'text-blue-400',
  };

  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'acknowledged');
  const pendingTasks = tasks.filter(t => t.status === 'scheduled' || t.status === 'in_progress');

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
          <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">System Maintenance</h3>
            <p className="text-sm text-slate-400">Monitor and maintain installed systems</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'alerts' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Alerts
          {openAlerts.length > 0 && (
            <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {openAlerts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
            activeTab === 'tasks' 
              ? 'text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Tasks
          {pendingTasks.length > 0 && (
            <span className="absolute top-2 right-4 w-5 h-5 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center">
              {pendingTasks.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* System Health Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{components.length}</div>
                <div className="text-xs text-slate-400">Components</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{openAlerts.length}</div>
                <div className="text-xs text-slate-400">Open Alerts</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{pendingTasks.length}</div>
                <div className="text-xs text-slate-400">Pending Tasks</div>
              </div>
            </div>

            {/* Components List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-400">System Components</h4>
              {components.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No components registered yet
                </div>
              ) : (
                components.map(component => (
                  <div 
                    key={component.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={statusColors[component.status]}>
                        {getComponentIcon(component.componentType)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {getComponentTypeLabel(component.componentType)}
                        </div>
                        <div className="text-xs text-slate-400">
                          {component.model || 'Unknown model'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${statusColors[component.status]}`}>
                        {component.status.charAt(0).toUpperCase() + component.status.slice(1)}
                      </div>
                      <div className="text-xs text-slate-400">
                        Health: {component.healthPercentage}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-slate-400">System Alerts</h4>
              <button
                onClick={() => setShowNewAlert(!showNewAlert)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Alert</span>
              </button>
            </div>

            {/* New Alert Form */}
            {showNewAlert && (
              <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Type</label>
                    <select
                      value={newAlert.alertType}
                      onChange={(e) => setNewAlert({ ...newAlert, alertType: e.target.value as AlertType })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="error">Error</option>
                      <option value="warning">Warning</option>
                      <option value="flag">Flag</option>
                      <option value="info">Info</option>
                      <option value="maintenance_due">Maintenance Due</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Severity</label>
                    <select
                      value={newAlert.severity}
                      onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value as AlertSeverity })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newAlert.title}
                    onChange={(e) => setNewAlert({ ...newAlert, title: e.target.value })}
                    placeholder="Alert title"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea
                    value={newAlert.description}
                    onChange={(e) => setNewAlert({ ...newAlert, description: e.target.value })}
                    placeholder="Alert description"
                    rows={2}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateAlert}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded transition-colors"
                  >
                    Create Alert
                  </button>
                  <button
                    onClick={() => setShowNewAlert(false)}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Alerts List */}
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No alerts
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${severityColors[alert.severity]}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.alertType)}
                        <div>
                          <div className="font-medium">{alert.title}</div>
                          {alert.description && (
                            <div className="text-xs opacity-80 mt-1">{alert.description}</div>
                          )}
                          <div className="text-xs opacity-60 mt-1">
                            {new Date(alert.createdAt).toLocaleDateString('en-AU')}
                          </div>
                        </div>
                      </div>
                      {alert.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveAlert(alert.id)}
                          className="p-1.5 bg-white/10 hover:bg-white/20 rounded transition-colors"
                          title="Mark as resolved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-slate-400">Maintenance Tasks</h4>
              <button
                onClick={() => setShowNewTask(!showNewTask)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Task</span>
              </button>
            </div>

            {/* New Task Form */}
            {showNewTask && (
              <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Task Type</label>
                    <select
                      value={newTask.taskType}
                      onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="inspection">Inspection</option>
                      <option value="cleaning">Cleaning</option>
                      <option value="repair">Repair</option>
                      <option value="replacement">Replacement</option>
                      <option value="upgrade">Upgrade</option>
                      <option value="troubleshooting">Troubleshooting</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Scheduled Date</label>
                    <input
                      type="date"
                      value={newTask.scheduledDate}
                      onChange={(e) => setNewTask({ ...newTask, scheduledDate: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    value={newTask.assignedTechnician}
                    onChange={(e) => setNewTask({ ...newTask, assignedTechnician: e.target.value })}
                    placeholder="Technician name"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateTask}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded transition-colors"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowNewTask(false)}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Tasks List */}
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No maintenance tasks scheduled
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    className={`p-3 rounded-lg border ${
                      task.status === 'completed' 
                        ? 'bg-emerald-500/10 border-emerald-500/30' 
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <Wrench className={`w-4 h-4 mt-0.5 ${task.status === 'completed' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div>
                          <div className={`font-medium ${task.status === 'completed' ? 'text-emerald-400' : 'text-white'}`}>
                            {task.title}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {task.scheduledDate}
                            </span>
                            {task.assignedTechnician && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {task.assignedTechnician}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded transition-colors"
                          title="Mark as completed"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceSection;
