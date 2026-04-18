import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendMessage, subscribeMessages, subscribeConversations, searchUsers, getConversationId } from '../../api/messaging';
import { getUserById } from '../../api/profile';

export default function MessagingPage() {
  const { currentUser, userData } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    const unsub = subscribeConversations(currentUser.uid, setConversations);
    return () => unsub();
  }, [currentUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (otherUid) => {
    const user = await getUserById(otherUid);
    setActiveUser(user);
    setActiveConv(getConversationId(currentUser.uid, otherUid));
    setSearch('');
    setSearchResults([]);
  };

  useEffect(() => {
    if (!activeConv || !activeUser) return;
    const unsub = subscribeMessages(currentUser.uid, activeUser.id, setMessages);
    return () => unsub();
  }, [activeConv, activeUser, currentUser.uid]);

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
    if (!input.trim() || !activeUser) return;
    const text = input;
    setInput('');
    await sendMessage(currentUser.uid, activeUser.id, text);
  };

  const getOtherUid = (conv) => conv.participants.find(p => p !== currentUser.uid);

  const timeStr = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-5">💬 Messages</h1>
      <div className="bg-white rounded-2xl shadow flex overflow-hidden" style={{ height: '600px' }}>
        {/* Sidebar */}
        <div className="w-72 border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Search people..."
              value={search}
              onChange={handleSearch}
            />
            {search && (
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-100 shadow-sm">
                {searching && <p className="text-xs text-gray-400 p-2">Searching...</p>}
                {!searching && searchResults.length === 0 && <p className="text-xs text-gray-400 p-2">No results</p>}
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => openConversation(u.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 text-left"
                  >
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||'U')}&background=3b82f6&color=fff&size=32`} className="w-8 h-8 rounded-full" alt="" />
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{u.role?.replace('_',' ')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !search && (
              <p className="text-center text-gray-400 text-sm p-6">Search for someone to start chatting</p>
            )}
            {conversations.map(conv => {
              const otherUid = getOtherUid(conv);
              return (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  otherUid={otherUid}
                  currentUid={currentUser.uid}
                  isActive={activeConv === conv.id}
                  onClick={() => openConversation(otherUid)}
                />
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        {!activeUser ? (
          <div className="flex-1 flex items-center justify-center text-gray-300">
            <div className="text-center">
              <p className="text-6xl mb-3">💬</p>
              <p className="font-medium">Select a conversation or search for someone</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <img src={activeUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeUser.name||'U')}&background=3b82f6&color=fff&size=40`} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <p className="font-semibold">{activeUser.name}</p>
                <p className="text-xs text-gray-400 capitalize">{activeUser.role?.replace('_',' ')}</p>
              </div>
              {['vendor','institution'].includes(activeUser.role) && (
                <div className="ml-auto text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">
                  📞 Contact via platform messaging only
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-gray-300 text-sm mt-8">No messages yet. Say hello! 👋</p>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === currentUser.uid;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>{timeStr(msg.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Type a message..."
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button type="submit" disabled={!input.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function ConvItem({ conv, otherUid, isActive, onClick }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    getUserById(otherUid).then(setUser);
  }, [otherUid]);

  if (!user) return null;
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 border-b border-gray-50 text-left transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
      <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name||'U')}&background=3b82f6&color=fff&size=40`} className="w-10 h-10 rounded-full flex-shrink-0" alt="" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{user.name}</p>
        <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
      </div>
    </button>
  );
}
