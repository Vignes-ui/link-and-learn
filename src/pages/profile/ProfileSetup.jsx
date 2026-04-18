import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/profile';
import { useNavigate } from 'react-router-dom';

export default function ProfileSetup() {
  const { currentUser, userData } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(currentUser.uid, {
        name,
        bio,
        profileCompleted: true,
      });
      navigate('/dashboard');
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isInstitutional = ['institution','govt_body','ngo','vendor','advertiser'].includes(userData?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome to Link & Learn</h2>
          <p className="text-gray-500 text-sm mt-1">Let's complete your profile to get started</p>
        </div>

        {userData?.accountStatus === 'pending' && (
          <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-4 mb-6 text-sm">
            <strong>⏳ Pending Approval</strong>
            <p className="mt-1">Your institutional account is under review. You can complete your profile while waiting for admin approval.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isInstitutional ? 'Organisation Name' : 'Full Name'}
            </label>
            <input
              type="text"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isInstitutional ? 'About your organisation' : 'Bio / About you'}
            </label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={isInstitutional ? "Describe your institution, mission, and focus areas..." : "Tell the community about yourself, your research interests, expertise..."}
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Complete Setup →'}
          </button>
        </form>
      </div>
    </div>
  );
}
