import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead, subscribeNotifications } from '../../api/notifications';
import { Bell, CheckCircle2, Heart, MessageCircle, UserPlus, Clock, ArrowRight } from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const unsub = subscribeNotifications(setNotifications);
    return () => unsub();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    fetchNotifications();
  };

  const handleNotificationClick = async (n) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    
    // Navigate based on type
    if (n.type === 'connection_request' || n.type === 'connection_accepted') {
      navigate('/network');
    } else if (n.type === 'post_like' || n.type === 'post_comment') {
      navigate('/feed'); // Ideally go to specific post
    }
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const secs = Math.floor((Date.now() - d) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
    if (secs < 84600) return Math.floor(secs / 3600) + 'h ago';
    return Math.floor(secs / 84600) + 'd ago';
  };

  const getIcon = (type) => {
    switch (type) {
      case 'connection_request': return <UserPlus className="w-5 h-5 text-primary-500" />;
      case 'connection_accepted': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'post_like': return <Heart className="w-5 h-5 text-red-500" fill="currentColor" />;
      case 'post_comment': return <MessageCircle className="w-5 h-5 text-indigo-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
          Notifications <Bell className="w-8 h-8 text-primary-400" />
        </h1>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={handleMarkAllRead}
            className="text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="glass-panel rounded-[2rem] border border-white/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-900 mb-2">All caught up!</h3>
            <p className="text-slate-500 font-medium">No new notifications at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => handleNotificationClick(n)}
                className={`p-6 flex items-start gap-4 hover:bg-white/60 transition-colors cursor-pointer relative group ${!n.isRead ? 'bg-primary-50/30' : ''}`}
              >
                {!n.isRead && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500" />
                )}
                
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {n.fromUser && (
                      <span className="font-bold text-slate-900">{n.fromUser.name}</span>
                    )}
                    <span className="text-slate-600 text-[15px]">{n.message}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(n.createdAt)}</span>
                  </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-primary-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
