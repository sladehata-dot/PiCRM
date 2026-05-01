import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Search, Trash2, Clock, MapPin, Zap, X, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AustralianBillData } from '@/types/BillData';
import {
  saveAnalysisSession,
  loadByNMI,
  loadByCustomerId,
  searchCustomers,
  getRecentSessions,
  deleteSession,
  SearchResult
} from '@/lib/databaseService';

interface SaveLoadSessionProps {
  bills: AustralianBillData[];
  onLoadSession: (bills: AustralianBillData[]) => void;
  variant?: 'default' | 'compact' | 'icon';
}

interface SessionItem {
  id: string;
  nmi: string;
  customerName: string;
  serviceAddress: string;
  retailer: string;
  billCount: number;
  lastUpdated: string;
}

const SaveLoadSession: React.FC<SaveLoadSessionProps> = ({ bills, onLoadSession, variant = 'default' }) => {
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SessionItem[]>([]);
  const [recentSessions, setRecentSessions] = useState<SessionItem[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load recent sessions when dialog opens
  useEffect(() => {
    if (isLoadDialogOpen) {
      loadRecentSessions();
    }
  }, [isLoadDialogOpen]);

  const loadRecentSessions = async () => {
    setIsLoadingRecent(true);
    const result = await getRecentSessions(10);
    setIsLoadingRecent(false);
    
    if (result.success && result.customers) {
      setRecentSessions(result.customers);
    }
  };

  const handleSave = async () => {
    if (bills.length === 0) {
      setSaveStatus('error');
      setSaveMessage('No bills to save');
      setTimeout(() => setSaveStatus('idle'), 3000);
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    const result = await saveAnalysisSession(bills);

    setIsSaving(false);

    if (result.success) {
      setSaveStatus('success');
      setSaveMessage(`Saved ${result.savedBillsCount} bill(s) successfully`);
    } else {
      setSaveStatus('error');
      setSaveMessage(result.error || 'Failed to save');
    }

    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLoadError('');
    
    const result = await searchCustomers(searchQuery);
    
    setIsSearching(false);

    if (result.success && result.customers) {
      setSearchResults(result.customers);
      if (result.customers.length === 0) {
        setLoadError('No customers found matching your search');
      }
    } else {
      setLoadError(result.error || 'Search failed');
    }
  };

  const handleLoadByNMI = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setLoadError('');

    const result = await loadByNMI(searchQuery);

    setIsLoading(false);

    if (result.success && result.bills) {
      onLoadSession(result.bills);
      setIsLoadDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setLoadError(result.error || 'Failed to load session');
    }
  };

  const handleLoadSession = async (customerId: string) => {
    setIsLoading(true);
    setLoadError('');

    const result = await loadByCustomerId(customerId);

    setIsLoading(false);

    if (result.success && result.bills) {
      onLoadSession(result.bills);
      setIsLoadDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setLoadError(result.error || 'Failed to load session');
    }
  };

  const handleDeleteSession = async (customerId: string) => {
    const result = await deleteSession(customerId);
    
    if (result.success) {
      setRecentSessions(prev => prev.filter(s => s.id !== customerId));
      setSearchResults(prev => prev.filter(s => s.id !== customerId));
      setDeleteConfirm(null);
    } else {
      setLoadError(result.error || 'Failed to delete session');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const SessionCard: React.FC<{ session: SessionItem }> = ({ session }) => (
    <div className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-cyan-400 text-sm">{session.nmi}</span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-400">{session.billCount} bill{session.billCount !== 1 ? 's' : ''}</span>
          </div>
          {session.customerName && (
            <p className="text-white font-medium truncate">{session.customerName}</p>
          )}
          {session.serviceAddress && (
            <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{session.serviceAddress}</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            {session.retailer && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{session.retailer}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(session.lastUpdated)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {deleteConfirm === session.id ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                onClick={() => handleDeleteSession(session.id)}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-slate-300"
                onClick={() => setDeleteConfirm(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="text-slate-400 hover:text-red-400 hover:bg-red-500/20"
                onClick={() => setDeleteConfirm(session.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => handleLoadSession(session.id)}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Compact variant - just buttons
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={handleSave}
          disabled={isSaving || bills.length === 0}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saveStatus === 'success' ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : saveStatus === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="ml-2">Save</span>
        </Button>
        
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="ml-2">Load</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Load Saved Session</DialogTitle>
              <DialogDescription className="text-slate-400">
                Search by NMI, customer name, or address to load a previously saved analysis session.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Search Section */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter NMI, name, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                
                {/* Quick NMI Load */}
                {searchQuery.replace(/\s/g, '').match(/^\d{10,11}$/) && (
                  <Button
                    variant="outline"
                    className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={handleLoadByNMI}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Load NMI: {searchQuery}
                  </Button>
                )}
              </div>

              {/* Error Message */}
              {loadError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {loadError}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-400">Search Results</h4>
                  <div className="space-y-2">
                    {searchResults.map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              {searchResults.length === 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-400">Recent Sessions</h4>
                  {isLoadingRecent ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  ) : recentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {recentSessions.map(session => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No saved sessions yet</p>
                      <p className="text-sm mt-1">Upload and save bills to see them here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Icon variant - dropdown menu
  if (variant === 'icon') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-700"
            >
              <FolderOpen className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white">
            <DropdownMenuItem
              onClick={handleSave}
              disabled={isSaving || bills.length === 0}
              className="hover:bg-slate-700 cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Session
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={() => setIsLoadDialogOpen(true)}
              className="hover:bg-slate-700 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Load Session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Save Status Toast */}
        {saveStatus !== 'idle' && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
            saveStatus === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
          }`}>
            {saveStatus === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-white text-sm">{saveMessage}</span>
          </div>
        )}

        {/* Load Dialog */}
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Load Saved Session</DialogTitle>
              <DialogDescription className="text-slate-400">
                Search by NMI, customer name, or address to load a previously saved analysis session.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Search Section */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter NMI, name, or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                
                {/* Quick NMI Load */}
                {searchQuery.replace(/\s/g, '').match(/^\d{10,11}$/) && (
                  <Button
                    variant="outline"
                    className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={handleLoadByNMI}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Load NMI: {searchQuery}
                  </Button>
                )}
              </div>

              {/* Error Message */}
              {loadError && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {loadError}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-400">Search Results</h4>
                  <div className="space-y-2">
                    {searchResults.map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              {searchResults.length === 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-400">Recent Sessions</h4>
                  {isLoadingRecent ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    </div>
                  ) : recentSessions.length > 0 ? (
                    <div className="space-y-2">
                      {recentSessions.map(session => (
                        <SessionCard key={session.id} session={session} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No saved sessions yet</p>
                      <p className="text-sm mt-1">Upload and save bills to see them here</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default variant - full buttons with labels
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        className="border-slate-600 text-slate-300 hover:bg-slate-700"
        onClick={handleSave}
        disabled={isSaving || bills.length === 0}
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : saveStatus === 'success' ? (
          <Check className="w-4 h-4 text-green-400 mr-2" />
        ) : saveStatus === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save Session'}
      </Button>
      
      <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Session
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Load Saved Session</DialogTitle>
            <DialogDescription className="text-slate-400">
              Search by NMI, customer name, or address to load a previously saved analysis session.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {/* Search Section */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter NMI, name, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-cyan-500 hover:bg-cyan-600"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              
              {/* Quick NMI Load */}
              {searchQuery.replace(/\s/g, '').match(/^\d{10,11}$/) && (
                <Button
                  variant="outline"
                  className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                  onClick={handleLoadByNMI}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Load NMI: {searchQuery}
                </Button>
              )}
            </div>

            {/* Error Message */}
            {loadError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {loadError}
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Search Results</h4>
                <div className="space-y-2">
                  {searchResults.map(session => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Sessions */}
            {searchResults.length === 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-400">Recent Sessions</h4>
                {isLoadingRecent ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : recentSessions.length > 0 ? (
                  <div className="space-y-2">
                    {recentSessions.map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No saved sessions yet</p>
                    <p className="text-sm mt-1">Upload and save bills to see them here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Status Toast */}
      {saveStatus !== 'idle' && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 ${
          saveStatus === 'success' ? 'bg-green-500/90' : 'bg-red-500/90'
        }`}>
          {saveStatus === 'success' ? (
            <Check className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-white text-sm">{saveMessage}</span>
        </div>
      )}
    </div>
  );
};

export default SaveLoadSession;
