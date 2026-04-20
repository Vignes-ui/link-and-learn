import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { sendMessage, subscribeMessages, subscribeConversations, searchUsers, getConversationId, createGroupConversation, getGroupConversations, sendGroupMessage, subscribeGroupMessages } from '../../api/messaging';
import { getConnectionStatus } from '../../api/connections';
import { getUserById } from '../../api/profile';
import { MessageSquare, Inbox, Hand } from 'lucide-react';

export default function MessagingPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState('');
  const [groupMsg, setGroupMsg] = useState('');
  const messagesEndRef = useRef();

  useEffect(() => {
    const unsub = subscribeConversations(currentUser.uid, setConversations);
    getGroupConversations().then(setGroups).catch(() => {});
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (otherUid) => {
    try {
      const user = await getUserById(otherUid);
      if (!user) return;
      
      setActiveUser(user);
      setActiveGroup(null);
      // We don't strictly need status to open, fetch it separately to avoid blocking
      getConnectionStatus(otherUid).then(({status}) => setConnectionStatus(status));
      
      // Use the participant pair as activeConv to identify the thread uniquely
      setActiveConv(getConversationId(currentUser.uid, otherUid));
      
      setSearch('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to open conversation', err);
    }
  };

  useEffect(() => {
    if (!activeConv || !activeUser) return;
    const unsub = subscribeMessages(currentUser.uid, activeUser.id, setMessages);
    return () => unsub();
  }, [activeConv, activeUser, currentUser.uid]);

  useEffect(() => {
    if (!activeGroup) return;
    const unsub = subscribeGroupMessages(activeGroup.id, setMessages);
    return () => unsub();
  }, [activeGroup]);

  const openGroup = (group) => {
    setActiveGroup(group);
    setActiveUser(null);
    setConnectionStatus('accepted');
    setActiveConv(`group_${group.id}`);
    setSearch('');
    setSearchResults([]);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const memberIds = groupMembers.split(',').map((item) => item.trim()).filter(Boolean);
    if (!groupName.trim() || memberIds.length < 2) {
      setGroupMsg('Add a group name and at least two member IDs.');
      return;
    }
    try {
      await createGroupConversation(groupName.trim(), memberIds);
      setGroupName('');
      setGroupMembers('');
      setGroupMsg('Group created');
      setGroups(await getGroupConversations());
      setTimeout(() => setGroupMsg(''), 2500);
    } catch (err) {
      setGroupMsg(err.message || 'Unable to create group');
    }
  };

  const handleSearch = async (e) => {
    const v = e.target.value;
    setSearch(v);
    if (v.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const results = await searchUsers(v);
      setSearchResults(results.filter(u => u.id !== currentUser.uid));
    } finally { setSearching(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || (!activeUser && !activeGroup)) return;
    const text = input;
    setInput('');
    if (activeGroup) await sendGroupMessage(activeGroup.id, text);
    else await sendMessage(currentUser.uid, activeUser.id, text);
  };

  const getOtherUid = (conv) => conv.participants.find(p => p !== currentUser.uid);

  const timeStr = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] min-h-[600px] flex flex-col animate-fade-in pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          Messages <MessageSquare className="w-8 h-8 text-primary-400" />
        </h1>
      </div>
      
      <div className="glass-panel flex-1 rounded-[2rem] shadow-lg border border-white/60 flex overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-[80px] opacity-40 -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-40 -z-10" />
        
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-200/60 flex flex-col flex-shrink-0 bg-white/40 backdrop-blur-md z-10">
          <div className="p-5 border-b border-slate-200/60">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <input
                className="w-full bg-white/60 border border-slate-200/60 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm transition-all"
                placeholder="Search connections..."
                value={search}
                onChange={handleSearch}
              />
            </div>
            
            {search && (
              <div className="absolute mt-2 left-5 right-5 z-50 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                {searching && <div className="p-4 text-center text-sm font-medium text-slate-500 flex items-center justify-center gap-2"><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Searching...</div>}
                {!searching && searchResults.length === 0 && <div className="p-4 text-center text-sm font-medium text-slate-500">No results found</div>}
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => openConversation(u.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0"
                  >
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||'U')}&background=e2e8f0&color=475569&size=40`} className="w-10 h-10 rounded-full" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">{u.role?.replace('_',' ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handleCreateGroup} className="mt-4 rounded-2xl border border-slate-200 bg-white/60 p-3 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New group</p>
              {groupMsg && <p className="text-xs font-bold text-primary-600">{groupMsg}</p>}
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Member IDs, comma separated"
                value={groupMembers}
                onChange={(e) => setGroupMembers(e.target.value)}
              />
              <button className="w-full rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">Create Group</button>
            </form>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {conversations.length === 0 && !search && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center opacity-50">
                <Inbox className="w-12 h-12 text-slate-400 mb-3" />
                <p className="text-sm font-bold text-slate-500">No conversations yet.</p>
                <p className="text-xs font-medium text-slate-400 mt-1">Search for a connection to start messaging.</p>
              </div>
            )}
            {groups.map((group) => (
              <button
                key={`group-${group.id}`}
                onClick={() => openGroup(group)}
                className={`w-full border-b border-slate-100 p-4 text-left transition-colors ${activeGroup?.id === group.id ? 'bg-primary-50/60' : 'hover:bg-white/60'}`}
              >
                <p className="text-sm font-bold text-slate-900 truncate">{group.name}</p>
                <p className="text-xs text-slate-500 truncate">{group.participants?.length || 0} members - {group.lastMessage || 'New group'}</p>
              </button>
            ))}
            {conversations.map(conv => {
              const otherUid = getOtherUid(conv);
              return (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  otherUid={otherUid}
                  currentUid={currentUser.uid}
                  isActive={activeConv === getConversationId(currentUser.uid, otherUid)}
                  onClick={() => openConversation(otherUid)}
                  onProfile={() => navigate(`/profile/${otherUid}`)}
                />
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col bg-white/20 z-10 relative">
          {!activeUser && !activeGroup ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center opacity-40">
                <div className="w-24 h-24 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-white/60">
                  <MessageSquare className="w-10 h-10 text-slate-500" />
                </div>
                <h3 className="text-xl font-display font-bold text-slate-800 mb-2">Your Messages</h3>
                <p className="text-slate-600 font-medium max-w-xs mx-auto">Select a conversation or start a new one to connect with peers, researchers, and institutions.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div 
                className="p-4 sm:p-5 border-b border-slate-200/60 flex items-center gap-4 bg-white/40 backdrop-blur-md cursor-pointer group"
                onClick={() => activeUser && navigate(`/profile/${activeUser.id}`)}
              >
                <div className="relative">
                  <img src={(activeUser?.avatar) || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser?.name || activeGroup?.name || 'G')}&background=e2e8f0&color=475569&size=48`} className="w-12 h-12 rounded-full shadow-sm group-hover:ring-2 ring-primary-500 transition-all" alt="" />
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-lg truncate group-hover:text-primary-600 transition-colors">{activeUser?.name || activeGroup?.name}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{activeGroup ? `${activeGroup.participants?.length || 0} members` : activeUser?.role?.replace('_',' ')}</p>
                </div>
                {activeUser && ['vendor','institution'].includes(activeUser.role) && (
                  <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 uppercase tracking-widest shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Platform Comms Only
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center opacity-50">
                    <div className="text-center">
                      <Hand className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-600">No messages yet. Say hello!</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.senderId === currentUser.uid;
                  const showAvatar = !isMe && (i === 0 || messages[i-1].senderId !== msg.senderId);
                  
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`} style={{ animationDuration: '0.3s' }}>
                      <div className={`flex gap-3 max-w-[85%] lg:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMe && (
                      <div className="w-8 flex-shrink-0 flex items-end">
                            {showAvatar && <img src={msg.senderAvatar || activeUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || activeUser?.name || 'U')}&background=e2e8f0&color=475569&size=32`} className="w-8 h-8 rounded-full mb-1" alt="" />}
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                            isMe 
                              ? 'bg-primary-600 text-white rounded-2xl rounded-br-sm' 
                              : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm'
                          }`}>
                            {activeGroup && !isMe && msg.senderName ? <span className="mb-1 block text-[10px] font-bold uppercase opacity-70">{msg.senderName}</span> : null}
                            {msg.text}
                          </div>
                          <span className={`text-[10px] font-bold text-slate-400 mt-1 mx-1`}>
                            {timeStr(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 sm:p-5 bg-white/40 backdrop-blur-md border-t border-slate-200/60">
                {connectionStatus === 'accepted' ? (
                  <>
                    <form onSubmit={handleSend} className="flex gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                      <input
                        className="flex-1 bg-transparent px-4 py-2 outline-none text-slate-700"
                        placeholder={`Message ${(activeUser?.name || activeGroup?.name || 'conversation').split(' ')[0]}...`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                      />
                      <button 
                        type="submit" 
                        disabled={!input.trim()} 
                        className="bg-primary-600 text-white w-10 h-10 flex items-center justify-center rounded-xl hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 transition-all shadow-sm shrink-0 group"
                      >
                        <svg className="w-4 h-4 translate-x-px group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                      </button>
                    </form>
                    <div className="text-center mt-2">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        End-to-end encrypted
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-100/50 border border-slate-200 rounded-2xl p-4 text-center">
                    <p className="text-sm font-bold text-slate-500 mb-1">
                      {connectionStatus === 'sent_pending' ? 'Connection Request Sent' : 
                       connectionStatus === 'received_pending' ? 'Invitation Received' : 
                       'Not Connected'}
                    </p>
                    <p className="text-xs font-medium text-slate-400">
                      You can only message people you are connected with.
                    </p>
                    <button 
                      onClick={() => navigate('/network')}
                      className="mt-3 text-primary-600 text-xs font-bold hover:underline"
                    >
                      {connectionStatus === 'received_pending' ? 'View Invitation →' : 'Go to Network →'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConvItem({ conv, otherUid, isActive, onClick, onProfile }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    getUserById(otherUid).then(setUser);
  }, [otherUid]);

  if (!user) return null;
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-4 text-left transition-colors border-b border-slate-100 last:border-0 ${isActive ? 'bg-primary-50/60' : 'hover:bg-white/60'}`}>
      <div className="relative shrink-0" onClick={(e) => { e.stopPropagation(); onProfile(); }}>
        <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||'U')}&background=e2e8f0&color=475569&size=48`} className="w-12 h-12 rounded-full border border-slate-200 shadow-sm hover:ring-2 ring-primary-500 transition-all" alt="" />
        {/* Mock online status indicator */}
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline mb-0.5">
          <p 
            className="font-bold text-sm text-slate-900 truncate pr-2 hover:text-primary-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); onProfile(); }}
          >
            {user.name}
          </p>
          {/* Mock timestamp, we could parse conv.updatedAt if available */}
          <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wide">12:30</span>
        </div>
        <p className={`text-xs truncate ${isActive ? 'text-primary-700 font-medium' : 'text-slate-500'}`}>{conv.lastMessage || 'New connection'}</p>
      </div>
    </button>
  );
}
