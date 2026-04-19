import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { searchUsers } from '../../api/messaging';
import { getConnections, requestConnection, respondConnection, getConnectionStatus } from '../../api/connections';
import { UserPlus, UserCheck, UserX, Search, Users, Clock, CheckCircle2 } from 'lucide-react';

export default function NetworkPage() {
  const { currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const data = await getConnections();
      setConnections(data.connections);
    } catch (err) {
      console.error('Failed to fetch connections', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (search.length < 2) return;
    setSearching(true);
    try {
      const results = await searchUsers(search);
      // For each result, we need to know the connection status
      const withStatus = await Promise.all(results.map(async (u) => {
        const { status } = await getConnectionStatus(u.id);
        return { ...u, connectionStatus: status };
      }));
      setSearchResults(withStatus.filter(u => u.id !== currentUser.uid));
    } finally {
      setSearching(false);
    }
  };

  const handleConnect = async (userId) => {
    try {
      await requestConnection(userId);
      // Update local state
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, connectionStatus: 'sent_pending' } : u));
      fetchConnections();
    } catch (err) {
      alert('Failed to send connection request');
    }
  };

  const handleResponse = async (userId, status) => {
    try {
      await respondConnection(userId, status);
      fetchConnections();
      // Also update search results if any
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, connectionStatus: status } : u));
    } catch (err) {
      alert('Failed to respond to request');
    }
  };

  const pendingReceived = connections.filter(c => c.status === 'received_pending');
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-indigo-950 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-primary-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 translate-x-1/2" />
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            My Network <Users className="w-8 h-8 text-primary-300" />
          </h1>
          <p className="text-slate-300 font-medium">Build your professional academic circle.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Search & Discover */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border border-white/60 shadow-sm">
            <h2 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Search className="w-5 h-5 text-primary-500" /> Discover People
            </h2>
            <form onSubmit={handleSearch} className="flex gap-3 mb-8">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="Search by name, role or institution..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={searching || search.length < 2}
                className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="space-y-4">
              {searchResults.length === 0 && search.length >= 2 && !searching && (
                <p className="text-center py-8 text-slate-500 font-medium">No one found with that name.</p>
              )}
              {searchResults.map(user => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  onConnect={() => handleConnect(user.id)} 
                  onAccept={() => handleResponse(user.id, 'accepted')}
                  onReject={() => handleResponse(user.id, 'rejected')}
                />
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6 sm:p-8 border border-white/60 shadow-sm">
            <h2 className="text-xl font-display font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" /> Your Connections
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {acceptedConnections.length === 0 && (
                <div className="col-span-full py-12 text-center">
                  <p className="text-slate-400 font-medium">You haven't connected with anyone yet.</p>
                </div>
              )}
              {acceptedConnections.map(user => (
                <div key={user.id} className="bg-white/40 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 group">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`} className="w-12 h-12 rounded-full border border-slate-100 shadow-sm" alt="" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{user.role?.replace('_',' ')}</p>
                  </div>
                  <button className="text-slate-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100" title="Remove Connection">
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Requests */}
        <div className="space-y-8">
          <div className="glass-panel rounded-[2rem] p-6 border border-white/60 shadow-sm">
            <h2 className="text-lg font-display font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> Invitations
            </h2>
            <div className="space-y-4">
              {pendingReceived.length === 0 && (
                <p className="text-sm font-medium text-slate-500 py-4 text-center">No pending invitations.</p>
              )}
              {pendingReceived.map(user => (
                <div key={user.id} className="bg-white/60 border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff`} className="w-10 h-10 rounded-full" alt="" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{user.role?.replace('_',' ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleResponse(user.id, 'accepted')}
                      className="flex-1 bg-primary-600 text-white py-1.5 rounded-lg text-xs font-bold hover:bg-primary-700 transition-all"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleResponse(user.id, 'rejected')}
                      className="flex-1 bg-slate-100 text-slate-600 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onConnect, onAccept, onReject }) {
  const status = user.connectionStatus;
  
  return (
    <div className="bg-white/60 border border-slate-100 rounded-[1.5rem] p-5 flex items-center gap-5 hover:shadow-md transition-all group">
      <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff&size=64`} className="w-16 h-16 rounded-full border-2 border-white shadow-sm" alt="" />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary-600 transition-colors">{user.name}</h3>
        <p className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-1">{user.role?.replace('_',' ')}</p>
        <p className="text-sm text-slate-600 line-clamp-1">{user.bio || 'Professional academic member'}</p>
      </div>
      <div className="shrink-0">
        {!status && (
          <button 
            onClick={onConnect}
            className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-primary-700 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Connect
          </button>
        )}
        {status === 'sent_pending' && (
          <div className="flex items-center gap-2 bg-slate-100 text-slate-500 px-5 py-2 rounded-xl text-sm font-bold border border-slate-200">
            <Clock className="w-4 h-4" /> Pending
          </div>
        )}
        {status === 'received_pending' && (
          <div className="flex gap-2">
            <button 
              onClick={onAccept}
              className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-sm hover:bg-emerald-700 transition-all"
              title="Accept Invitation"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
            <button 
              onClick={onReject}
              className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-100 transition-all border border-red-100"
              title="Ignore Invitation"
            >
              <UserX className="w-5 h-5" />
            </button>
          </div>
        )}
        {status === 'accepted' && (
          <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-5 py-2 rounded-xl text-sm font-bold border border-emerald-200">
            <UserCheck className="w-4 h-4" /> Connected
          </div>
        )}
      </div>
    </div>
  );
}
