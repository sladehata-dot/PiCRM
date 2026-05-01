import React, { useState, useEffect } from 'react';
import {
  Save,
  FolderOpen,
  Search,
  Trash2,
  Clock,
  MapPin,
  Zap,
  X,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  Users,
  FileText,
  DollarSign,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/AppContext';
import {
  getAllSessions,
  deleteSession,
  SessionSummary,
  SessionStatus,
} from '@/lib/sessionService';

interface SessionManagerProps {
  variant?: 'default' | 'compact' | 'header';
  onSessionLoaded?: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({ variant = 'default', onSessionLoaded }) => {
  const {
    currentSession,
    sessionCode,
    isSessionLoading,
    sessionError,
    startNewSession,
    loadSessionByCode,
    saveSession,
  } = useAppContext();

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSalesDialogOpen, setIsSalesDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [loadCode, setLoadCode] = useState('');
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Sales view state
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Load sessions for sales view
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    const result = await getAllSessions({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchQuery || undefined,
      limit: 50,
    });
    setIsLoadingSessions(false);
    
    if (result.success && result.sessions) {
      setSessions(result.sessions);
    }
  };

  useEffect(() => {
    if (isSalesDialogOpen) {
      loadSessions();
    }
  }, [isSalesDialogOpen, statusFilter]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    const success = await saveSession();

    setIsSaving(false);

    if (success) {
      setSaveStatus('success');
      setSaveMessage('Session saved successfully');
    } else {
      setSaveStatus('error');
      setSaveMessage(sessionError || 'Failed to save session');
    }

    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleLoad = async () => {
    if (!loadCode.trim()) {
      setLoadError('Please enter a session code');
      return;
    }

    setIsLoading(true);
    setLoadError('');

    const success = await loadSessionByCode(loadCode.trim().toUpperCase());

    setIsLoading(false);

    if (success) {
      setIsLoadDialogOpen(false);
      setLoadCode('');
      onSessionLoaded?.();
    } else {
      setLoadError(sessionError || 'Session not found');
    }
  };

  const handleCopyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLoadSession = async (code: string) => {
    setIsLoading(true);
    const success = await loadSessionByCode(code);
    setIsLoading(false);
    
    if (success) {
      setIsSalesDialogOpen(false);
      onSessionLoaded?.();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    const result = await deleteSession(sessionId);
    if (result.success) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: SessionStatus, isEligible: boolean | null) => {
    if (status === 'eligible' || isEligible === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Eligible
        </span>
      );
    }
    if (status === 'not_eligible' || isEligible === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3" />
          Not Eligible
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
          <Check className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (status === 'archived') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-500/20 text-slate-400">
          <FileText className="w-3 h-3" />
          Archived
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">
        <Clock className="w-3 h-3" />
        In Progress
      </span>
    );
  };

  // Header variant - compact display for header
  if (variant === 'header') {
    return (
      <div className="flex items-center gap-2">
        {sessionCode && (
          <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-1.5 rounded-lg">
            <span className="text-xs text-slate-400">Session:</span>
            <span className="font-mono text-cyan-400 text-sm">{sessionCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copy session code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        
        <Button
          size="sm"
          variant="ghost"
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </Button>

        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Load Session</DialogTitle>
              <DialogDescription className="text-slate-400">
                Enter your 8-character session code to continue where you left off.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input
                  placeholder="Enter session code (e.g., ABC12345)"
                  value={loadCode}
                  onChange={(e) => setLoadCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 font-mono text-center text-lg tracking-wider"
                  maxLength={8}
                />
                {loadError && (
                  <p className="text-red-400 text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {loadError}
                  </p>
                )}
              </div>
              
              <Button
                className="w-full bg-cyan-500 hover:bg-cyan-600"
                onClick={handleLoad}
                disabled={isLoading || loadCode.length !== 8}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FolderOpen className="w-4 h-4 mr-2" />
                )}
                Load Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sales Staff View Button */}
        <Dialog open={isSalesDialogOpen} onOpenChange={setIsSalesDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
              title="Sales Staff View"
            >
              <Users className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Customer Sessions
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                View and manage all customer eligibility sessions.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col gap-4">
              {/* Filters */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search by code, name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadSessions()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as SessionStatus | 'all')}
                  className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="in_progress">In Progress</option>
                  <option value="eligible">Eligible</option>
                  <option value="not_eligible">Not Eligible</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600"
                  onClick={loadSessions}
                  disabled={isLoadingSessions}
                >
                  {isLoadingSessions ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {isLoadingSessions ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sessions found</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-cyan-400 text-sm bg-cyan-500/10 px-2 py-0.5 rounded">
                              {session.sessionCode}
                            </span>
                            {getStatusBadge(session.status, session.isEligible)}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {session.customerName && (
                              <div>
                                <p className="text-slate-500 text-xs">Name</p>
                                <p className="text-white truncate">{session.customerName}</p>
                              </div>
                            )}
                            {session.customerEmail && (
                              <div>
                                <p className="text-slate-500 text-xs">Email</p>
                                <p className="text-white truncate">{session.customerEmail}</p>
                              </div>
                            )}
                            {session.customerPhone && (
                              <div>
                                <p className="text-slate-500 text-xs">Phone</p>
                                <p className="text-white">{session.customerPhone}</p>
                              </div>
                            )}
                            {session.postcode && (
                              <div>
                                <p className="text-slate-500 text-xs">Postcode</p>
                                <p className="text-white">{session.postcode}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-slate-500 text-xs">Bills</p>
                              <p className="text-white flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {session.billCount}
                              </p>
                            </div>
                            {session.totalSavings !== undefined && session.totalSavings > 0 && (
                              <div>
                                <p className="text-slate-500 text-xs">Potential Savings</p>
                                <p className="text-emerald-400 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {session.totalSavings.toFixed(2)}
                                </p>
                              </div>
                            )}
                            <div>
                              <p className="text-slate-500 text-xs">Last Updated</p>
                              <p className="text-slate-400 text-xs">{formatDate(session.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-cyan-500 hover:bg-cyan-600 text-white"
                            onClick={() => handleLoadSession(session.sessionCode)}
                            disabled={isLoading}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {sessionCode && (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-slate-400">Code:</span>
            <span className="font-mono text-cyan-400">{sessionCode}</span>
            <button
              onClick={handleCopyCode}
              className="text-slate-400 hover:text-white"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
        
        <Button
          size="sm"
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="ml-2">Save</span>
        </Button>
      </div>
    );
  }

  // Default variant - full UI
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Save className="w-5 h-5 text-cyan-400" />
        Session Management
      </h3>
      
      <div className="space-y-4">
        {/* Current Session Info */}
        {sessionCode && (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400 mb-1">Your Session Code</p>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xl text-cyan-400 tracking-wider">{sessionCode}</span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-300" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Save this code to return to your session later
                </p>
              </div>
              
              {currentSession && (
                <div className="text-right">
                  {getStatusBadge(currentSession.status, currentSession.isEligible)}
                  <p className="text-xs text-slate-500 mt-2">
                    Last saved: {formatDate(currentSession.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : saveStatus === 'success' ? (
              <Check className="w-4 h-4 mr-2 text-emerald-400" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {sessionCode ? 'Save Progress' : 'Create Session'}
          </Button>
          
          <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Session
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Load Session</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter your 8-character session code to continue where you left off.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter session code (e.g., ABC12345)"
                    value={loadCode}
                    onChange={(e) => setLoadCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 font-mono text-center text-lg tracking-wider"
                    maxLength={8}
                  />
                  {loadError && (
                    <p className="text-red-400 text-sm flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {loadError}
                    </p>
                  )}
                </div>
                
                <Button
                  className="w-full bg-cyan-500 hover:bg-cyan-600"
                  onClick={handleLoad}
                  disabled={isLoading || loadCode.length !== 8}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <FolderOpen className="w-4 h-4 mr-2" />
                  )}
                  Load Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Message */}
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            saveStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {saveStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{saveMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionManager;
