import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

import { FileText, BookOpen, Briefcase, CalendarDays, MessageSquare, Building2, ShieldCheck, Menu, X, LogOut, Users, Bell, Megaphone } from 'lucide-react';
import { subscribeNotifications } from '../api/notifications';
import { initPushForUser } from '../utils/pushNotifications';

const NAV_ITEMS = [
  { label: 'Feed', path: '/feed', icon: <FileText className="w-5 h-5" />, roles: '*' },
  { label: 'Network', path: '/network', icon: <Users className="w-5 h-5" />, roles: '*' },
  { label: 'Articles', path: '/articles', icon: <BookOpen className="w-5 h-5" />, roles: '*' },
  { label: 'Recruitment', path: '/recruitment', icon: <Briefcase className="w-5 h-5" />, roles: '*' },
  { label: 'Events', path: '/events', icon: <CalendarDays className="w-5 h-5" />, roles: '*' },
  { label: 'Messages', path: '/messages', icon: <MessageSquare className="w-5 h-5" />, roles: '*' },
  { label: 'Notifications', path: '/notifications', icon: <Bell className="w-5 h-5" />, roles: '*' },
  { label: 'Vendor', path: '/vendor', icon: <Building2 className="w-5 h-5" />, roles: ['institution','govt_body','ngo','vendor','admin'] },
  { label: 'Ads', path: '/ads', icon: <Megaphone className="w-5 h-5" />, roles: ['advertiser','institution','govt_body','ngo','vendor','admin'] },
  { label: 'Admin', path: '/admin', icon: <ShieldCheck className="w-5 h-5" />, roles: ['admin'] },
];

export default function Layout({ children }) {
  const { userData, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIdsRef = useRef(new Set());
  const hydratedNotificationsRef = useRef(false);

  useEffect(() => {
    if (!userData) return;
    initPushForUser(userData).catch(() => {});
    hydratedNotificationsRef.current = false;
    seenNotificationIdsRef.current = new Set();
    const unsub = subscribeNotifications((notifs) => {
      setUnreadCount(notifs.filter(n => !n.isRead).length);
      if (!hydratedNotificationsRef.current) {
        notifs.forEach((notif) => seenNotificationIdsRef.current.add(notif.id));
        hydratedNotificationsRef.current = true;
        return;
      }
      for (const notif of notifs) {
        if (!notif.isRead && !seenNotificationIdsRef.current.has(notif.id)) {
          seenNotificationIdsRef.current.add(notif.id);
          if ('Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
            if (Notification.permission === 'granted') {
              new Notification('Link & Learn', {
                body: notif.fromUser ? `${notif.fromUser.name} ${notif.message}` : notif.message,
              });
            }
          }
        }
      }
    });
    return () => unsub();
  }, [userData]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visibleLinks = NAV_ITEMS.filter(item =>
    item.roles === '*' || item.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 flex overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-slate-200 rounded-full blur-[150px] opacity-40" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-slate-200 rounded-full blur-[120px] opacity-40" />
      </div>

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200/50 fixed h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Logo */}
        <div className="p-6 cursor-pointer" onClick={() => navigate('/feed')}>
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/30 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-display font-bold text-xl tracking-tighter">L</span>
            </div>
            <span className="font-display font-bold text-slate-900 text-xl tracking-tight">Link & Learn</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto custom-scrollbar">
          {visibleLinks.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative ${
                  active 
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 translate-x-1' 
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-900 hover:shadow-sm'
                }`}
              >
                <span className={`text-lg ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-opacity`}>{item.icon}</span>
                {item.label}
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 m-4 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-3 cursor-pointer group" onClick={() => navigate('/profile')}>
            <div className="relative">
              <img
                src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=3b82f6&color=fff&size=40`}
                className="w-10 h-10 rounded-full object-cover shadow-sm group-hover:ring-2 ring-primary-500 transition-all duration-300"
                alt=""
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate group-hover:text-primary-600 transition-colors">{userData?.name || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize truncate font-medium">{userRole?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-transparent hover:border-red-100"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 glass-panel border-b border-slate-200/50 z-20 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2" onClick={() => navigate('/feed')}>
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-display font-bold text-sm">L</span>
          </div>
          <span className="font-display font-bold text-slate-900">Link & Learn</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 -mr-2 text-slate-600 hover:text-slate-900 transition-colors">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-2xl p-4 flex flex-col transform transition-transform animate-slide-up">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <span className="font-display font-bold text-slate-900">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {visibleLinks.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${active ? 'bg-primary-50 text-primary-600' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>{item.icon}</span>{item.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto pt-4 border-t border-slate-100">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 w-full min-h-screen overflow-x-hidden">
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto h-full animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
