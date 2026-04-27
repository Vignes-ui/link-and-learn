import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile } from '../../api/profile';
import { useNavigate } from 'react-router-dom';
import { getHomePathForRole } from '../../constants/navigation';
import { Sparkles, Building2, UserCircle, Clock, ArrowRight } from 'lucide-react';

export default function ProfileSetup() {
  const { currentUser, userData, refreshUser } = useAuth();
  const [name, setName] = useState(userData?.name || '');
  const [bio, setBio] = useState('');
  const [departmentsText, setDepartmentsText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(currentUser.uid, {
        name,
        bio,
        departments: isInstitutional
          ? departmentsText
              .split('\n')
              .map(line => line.trim())
              .filter(Boolean)
              .map(name => ({ name, clubs: [] }))
          : undefined,
        profileCompleted: true,
      });
      await refreshUser();
      navigate(getHomePathForRole(userData?.role));
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isInstitutional = ['institution','govt_body','ngo','vendor','advertiser'].includes(userData?.role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-4 relative overflow-hidden">
      {/* Ambient background blobs */}
      <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] bg-primary-200 rounded-full blur-[120px] opacity-30 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-8%] w-[35%] h-[35%] bg-slate-200 rounded-full blur-[100px] opacity-40 pointer-events-none" />
      <div className="absolute top-[40%] left-[5%] w-[20%] h-[20%] bg-indigo-100 rounded-full blur-[80px] opacity-30 pointer-events-none" />

      <div className="w-full max-w-lg animate-fade-in">
        {/* Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/80 overflow-hidden">

          {/* Top accent stripe */}
          <div className="h-1.5 w-full bg-gradient-to-r from-primary-400 via-primary-600 to-indigo-500" />

          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
                Welcome to Link & Learn
              </h1>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Let's complete your profile to get started
              </p>
            </div>

            {/* Pending approval banner */}
            {userData?.accountStatus === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-bold text-sm">Pending Approval</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Your institutional account is under review. Complete your profile while you wait for admin approval.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  {isInstitutional
                    ? <><Building2 className="w-3.5 h-3.5" /> Organisation Name</>
                    : <><UserCircle className="w-3.5 h-3.5" /> Full Name</>
                  }
                </label>
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm"
                  placeholder={isInstitutional ? 'e.g. Sri Ramakrishna College of Arts & Science' : 'e.g. Rahul Sharma'}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              {/* Bio field */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {isInstitutional ? 'About your organisation' : 'Bio / About you'}
                </label>
                <textarea
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm resize-none"
                  placeholder={
                    isInstitutional
                      ? 'Describe your institution, mission, and focus areas...'
                      : 'Tell the community about yourself, your research interests, expertise...'
                  }
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>

              {isInstitutional && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Departments
                  </label>
                  <textarea
                    rows={4}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all shadow-sm resize-none"
                    placeholder={'Enter one department per line\nComputer Science\nMechanical Engineering\nCommerce'}
                    value={departmentsText}
                    onChange={e => setDepartmentsText(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    You can add clubs for each department later from your profile.
                  </p>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3.5 rounded-xl font-bold text-base shadow-md shadow-primary-500/30 hover:bg-primary-700 hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all group"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Setting up your profile...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 font-medium">
          Your profile information can be updated at any time.
        </p>
      </div>
    </div>
  );
}
