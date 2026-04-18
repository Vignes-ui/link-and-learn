import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: '🏠', roles: '*' },
  { label: 'Feed', path: '/feed', icon: '📝', roles: '*' },
  { label: 'Articles', path: '/articles', icon: '📚', roles: '*' },
  { label: 'Recruitment', path: '/recruitment', icon: '💼', roles: '*' },
  { label: 'Events', path: '/events', icon: '🗓', roles: '*' },
  { label: 'Messages', path: '/messages', icon: '💬', roles: '*' },
  { label: 'Vendor', path: '/vendor', icon: '🏭', roles: ['institution','govt_body','ngo','vendor','admin'] },
  { label: 'Admin', path: '/admin', icon: '🛡', roles: ['admin'] },
];

export default function Layout({ children }) {
  const { userData, userRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const visibleLinks = NAV_ITEMS.filter(item =>
    item.roles === '*' || item.roles.includes(userRole)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 fixed h-full z-10">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Link & Learn</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {visibleLinks.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/profile')}>
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'U')}&background=3b82f6&color=fff&size=36`}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              alt=""
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{userData?.name || 'User'}</p>
              <p className="text-xs text-gray-400 capitalize truncate">{userRole?.replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2" onClick={() => navigate('/dashboard')}>
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <span className="font-bold text-gray-900">Link & Learn</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-gray-100">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-30 z-30" onClick={() => setMobileOpen(false)}>
          <div className="bg-white w-64 h-full shadow-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="space-y-1 mt-4">
              {visibleLinks.map(item => {
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span>{item.icon}</span>{item.label}
                  </button>
                );
              })}
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 mt-4">
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-16 md:pt-0">
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
