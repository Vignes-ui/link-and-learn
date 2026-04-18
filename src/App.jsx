import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import AuthPage from './pages/auth/AuthPage';

// Profile
import Profile from './pages/profile/Profile';
import ProfileSetup from './pages/profile/ProfileSetup';

// Features
import FeedPage from './pages/feed/FeedPage';
import ArticlesPage from './pages/articles/ArticlesPage';
import RecruitmentPage from './pages/recruitment/RecruitmentPage';
import EventsPage from './pages/events/EventsPage';
import MessagingPage from './pages/messaging/MessagingPage';
import VendorPage from './pages/vendor/VendorPage';
import AdminPage from './pages/admin/AdminPage';

// Guards + Layout
import ProtectedRoute from './components/ProtectedRoute';
import ProfileGuard from './components/ProfileGuard';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<AuthPage />} />

        {/* Profile Setup */}
        <Route path="/setup-profile" element={
          <ProtectedRoute>
            <Layout><ProfileSetup /></Layout>
          </ProtectedRoute>
        } />

        {/* /dashboard → redirect to /feed */}
        <Route path="/dashboard" element={<Navigate to="/feed" replace />} />

        {/* Profile */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><Profile /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Feed */}
        <Route path="/feed" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><FeedPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Articles */}
        <Route path="/articles" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><ArticlesPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Recruitment */}
        <Route path="/recruitment" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><RecruitmentPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Events */}
        <Route path="/events" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><EventsPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Messaging */}
        <Route path="/messages" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><MessagingPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Vendor Connector */}
        <Route path="/vendor" element={
          <ProtectedRoute>
            <ProfileGuard>
              <Layout><VendorPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ProfileGuard>
              <Layout><AdminPage /></Layout>
            </ProfileGuard>
          </ProtectedRoute>
        } />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
