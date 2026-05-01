import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, RefreshCw, LayoutGrid, List, 
  ChevronDown, X, Users, Clock, UserCheck, CheckCircle, Archive, ArrowLeft, Zap, Activity, Wrench
} from 'lucide-react';
import { getAllSessions, SessionSummary, SessionStatus } from '@/lib/sessionService';
import LeadCard from './LeadCard';
import CRMStats from './CRMStats';
import LeadDetailModal from './LeadDetailModal';

type ViewMode = 'grid' | 'list' | 'kanban';
type FilterStatus = SessionStatus | 'all';
type WorkflowFilter = 'all' | 'installing' | 'maintenance';

const statusOrder: SessionStatus[] = ['in_progress', 'eligible', 'completed', 'not_eligible', 'archived'];

const statusConfig: Record<SessionStatus, { label: string; color: string; icon: React.ElementType }> = {
  in_progress: { label: 'In Progress', color: 'amber', icon: Clock },
  eligible: { label: 'Eligible', color: 'emerald', icon: UserCheck },
  not_eligible: { label: 'Not Eligible', color: 'red', icon: X },
  completed: { label: 'Completed', color: 'cyan', icon: CheckCircle },
  archived: { label: 'Archived', color: 'slate', icon: Archive },
};


const CRMDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Modal
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const result = await getAllSessions({ limit: 100 });
    
    if (result.success && result.sessions) {
      setSessions(result.sessions);
    } else {
      setError(result.error || 'Failed to load sessions');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Apply filters
  useEffect(() => {
    let filtered = [...sessions];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.sessionCode.toLowerCase().includes(query) ||
        (s.customerName && s.customerName.toLowerCase().includes(query)) ||
        (s.customerEmail && s.customerEmail.toLowerCase().includes(query)) ||
        (s.customerPhone && s.customerPhone.includes(query)) ||
        (s.postcode && s.postcode.includes(query))
      );
    }
    
    setFilteredSessions(filtered);
  }, [sessions, statusFilter, searchQuery]);

  const handleRefresh = () => {
    loadSessions();
  };

  const handleLeadClick = (sessionId: string) => {
    setSelectedSessionId(sessionId);
  };

  const handleModalClose = () => {
    setSelectedSessionId(null);
  };

  const handleLeadUpdate = () => {
    loadSessions();
  };

  // Group sessions by status for kanban view
  const sessionsByStatus = statusOrder.reduce((acc, status) => {
    acc[status] = filteredSessions.filter(s => s.status === status);
    return acc;
  }, {} as Record<SessionStatus, SessionSummary[]>);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <Link 
              to="/"
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Analysis</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-lg">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Pi Energy CRM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-7 h-7 text-cyan-400" />
                Lead Pipeline
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Manage and track all customer leads
              </p>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leads..."
                  className="w-48 md:w-64 bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Filter Button */}
              <div className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    statusFilter !== 'all' 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' 
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
                
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                    <div className="p-2">
                      <button
                        onClick={() => { setStatusFilter('all'); setShowFilters(false); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                          statusFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        All Leads
                      </button>
                      {statusOrder.map(status => {
                        const config = statusConfig[status];
                        const Icon = config.icon;
                        return (
                          <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setShowFilters(false); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                              statusFilter === status ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="flex items-center bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-600 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-600 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-slate-600 text-cyan-400' : 'text-slate-400 hover:text-white'}`}
                  title="Kanban View"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="5" height="18" rx="1" />
                    <rect x="10" y="3" width="5" height="12" rx="1" />
                    <rect x="17" y="3" width="5" height="15" rx="1" />
                  </svg>
                </button>
              </div>
              
              {/* Refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="mb-6">
          <CRMStats sessions={sessions} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <span className="text-red-400">{error}</span>
            <button onClick={handleRefresh} className="text-red-400 hover:text-red-300">
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && sessions.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading leads...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {searchQuery || statusFilter !== 'all' ? 'No matching leads' : 'No leads yet'}
            </h3>
            <p className="text-slate-400 mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search query' 
                : 'Leads will appear here when customers complete the eligibility questionnaire'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Grid View */}
        {viewMode === 'grid' && filteredSessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(session => (
              <LeadCard 
                key={session.id} 
                lead={session} 
                onClick={() => handleLeadClick(session.id)}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && filteredSessions.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-slate-700/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Bills</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Savings</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredSessions.map(session => {
                  const status = statusConfig[session.status];
                  const statusColorClasses = {
                    amber: 'bg-amber-500/20 text-amber-400',
                    emerald: 'bg-emerald-500/20 text-emerald-400',
                    red: 'bg-red-500/20 text-red-400',
                    cyan: 'bg-cyan-500/20 text-cyan-400',
                    slate: 'bg-slate-500/20 text-slate-400',
                  };
                  return (
                    <tr 
                      key={session.id}
                      onClick={() => handleLeadClick(session.id)}
                      className="hover:bg-slate-700/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-slate-500">{session.sessionCode}</div>
                        <div className="text-white font-medium">{session.customerName || 'Unnamed'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-300">{session.customerEmail || '-'}</div>
                        <div className="text-xs text-slate-500">{session.customerPhone || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColorClasses[status.color as keyof typeof statusColorClasses]}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{session.billCount}</td>
                      <td className="px-4 py-3">
                        {session.totalSavings ? (
                          <span className="text-emerald-400 font-medium">
                            ${session.totalSavings.toFixed(0)}/yr
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(session.updatedAt).toLocaleDateString('en-AU')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Kanban View */}
        {viewMode === 'kanban' && filteredSessions.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {statusOrder.filter(s => s !== 'archived').map(status => {
              const config = statusConfig[status];
              const Icon = config.icon;
              const leads = sessionsByStatus[status];
              const colorClasses = {
                amber: { icon: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
                emerald: { icon: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-400' },
                red: { icon: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
                cyan: { icon: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400' },
                slate: { icon: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-400' },
              };
              const colors = colorClasses[config.color as keyof typeof colorClasses];
              
              return (
                <div 
                  key={status}
                  className="flex-shrink-0 w-80 bg-slate-800/50 rounded-xl"
                >
                  <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${colors.icon}`} />
                      <span className="text-white font-medium">{config.label}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                      {leads.length}
                    </span>
                  </div>
                  <div className="p-3 space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                    {leads.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No leads
                      </div>
                    ) : (
                      leads.map(lead => (
                        <LeadCard 
                          key={lead.id} 
                          lead={lead} 
                          onClick={() => handleLeadClick(lead.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      {selectedSessionId && (
        <LeadDetailModal
          sessionId={selectedSessionId}
          onClose={handleModalClose}
          onUpdate={handleLeadUpdate}
        />
      )}
    </div>
  );
};

export default CRMDashboard;
