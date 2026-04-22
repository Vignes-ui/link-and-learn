import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getUserById } from '../../api/profile';
import { getConnections, requestConnection, removeConnection } from '../../api/connections';
import { MessageSquare, UserPlus, CheckCircle2, Clock, GraduationCap, Briefcase, FileText, ChevronRight, Mail, Calendar, UserX } from 'lucide-react';

export default function UserProfile() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (id === currentUser.uid) {
      navigate('/profile');
      return;
    }
    fetchUser();
  }, [id, currentUser.uid]);

  const fetchUser = async () => {
    try {
      const u = await getUserById(id);
      setUser(u);
      
      const { connections } = await getConnections();
      const conn = connections.find(c => c.id === String(id));
      setConnectionStatus(conn ? conn.status : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await requestConnection(id);
      setConnectionStatus('sent_pending');
    } catch (err) {
      alert('Failed to send connection request');
    }
  };

  const handleRemove = async () => {
    try {
      if (!window.confirm('Are you sure you want to remove this connection?')) return;
      await removeConnection(id);
      setConnectionStatus(null);
    } catch (err) {
      alert('Failed to remove connection');
    }
  };

  if (loading) return <div className="p-20 text-center font-medium text-slate-500">Loading profile...</div>;
  if (!user) return <div className="p-20 text-center font-medium text-slate-500">User not found</div>;

  const isInstitutional = ['institution', 'govt_body', 'ngo', 'vendor', 'advertiser', 'admin'].includes(user.role);
  const tabs = isInstitutional ? ['overview'] : ['overview', 'skills', 'education', 'experience', 'publications'];
  const departments = Array.isArray(user.departments) ? user.departments : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header Card */}
      <div className="relative glass-panel rounded-[2.5rem] p-8 md:p-10 border border-white/60 overflow-hidden shadow-xl">
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-600 opacity-20" />
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-transparent to-[#FAF9F6]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8 mt-10">
          <div className="relative">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-primary-400 to-indigo-500 rounded-full blur opacity-20"></div>
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3b82f6&color=fff&size=150`}
              className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-white shadow-2xl"
              alt={user.name}
            />
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
              <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">{user.name}</h2>
              {user.verifiedBadge && <CheckCircle2 className="w-6 h-6 text-primary-500" />}
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Mail className="w-4 h-4" /> {user.email}
              </span>
              <span className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-primary-100">
                {user.role?.replace('_', ' ')}
              </span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {connectionStatus === 'accepted' ? (
                <>
                  <button 
                    onClick={() => navigate('/messages')}
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/30 hover:bg-primary-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" /> Send Message
                  </button>
                  <button 
                    onClick={handleRemove}
                    className="bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold border border-red-200 hover:bg-red-100 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                  >
                    <UserX className="w-5 h-5" /> Unfriend
                  </button>
                </>
              ) : connectionStatus === 'sent_pending' ? (
                <button disabled className="bg-slate-100 text-slate-500 px-6 py-3 rounded-xl font-bold border border-slate-200 flex items-center gap-2 cursor-default">
                  <Clock className="w-5 h-5" /> Request Pending
                </button>
              ) : connectionStatus === 'received_pending' ? (
                <button 
                  onClick={() => navigate('/network')}
                  className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-amber-500/30 hover:bg-amber-600 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" /> Respond to Request
                </button>
              ) : (
                <button 
                  onClick={handleConnect}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" /> Connect
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Sidebar Info */}
        <div className="space-y-6">
          <div className="glass-panel rounded-[2rem] p-6 border border-white/60 shadow-sm">
            <h3 className="text-lg font-display font-bold text-slate-900 mb-4">About</h3>
            <p className="text-slate-600 leading-relaxed italic">
              {user.bio || "No bio provided."}
            </p>
          </div>

          {!isInstitutional && (
            <div className="glass-panel rounded-[2rem] p-6 border border-white/60 shadow-sm">
              <h3 className="text-lg font-display font-bold text-slate-900 mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {user.skills?.length > 0 ? (
                  user.skills.map(s => (
                    <span key={s} className="bg-white border border-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                      {s}
                    </span>
                  ))
                ) : <p className="text-xs text-slate-400 italic">No skills listed</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-[2rem] border border-white/60 shadow-sm overflow-hidden">
            {!isInstitutional && (
              <div className="flex overflow-x-auto border-b border-slate-100 bg-white/40">
                {tabs.filter(t => t !== 'overview' && t !== 'skills').map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-8 py-5 text-sm font-bold capitalize transition-all relative ${tab === t ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {t}
                    {tab === t && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary-500 rounded-t-full" />}
                  </button>
                ))}
              </div>
            )}

            <div className="p-8">
              {tab === 'overview' && (
                isInstitutional ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <h3 className="text-lg font-display font-bold text-slate-900">Departments</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Explore the organisation structure and the clubs attached to each department.
                      </p>
                    </div>

                    {departments.length === 0 ? (
                      <div className="text-slate-500 italic">No departments have been published yet.</div>
                    ) : (
                      <div className="space-y-4">
                        {departments.map((dept, deptIndex) => (
                          <div key={deptIndex} className="bg-white/70 border border-slate-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-4 mb-4">
                              <h4 className="text-lg font-bold text-slate-900">{dept?.name || 'Unnamed Department'}</h4>
                              <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                                {(dept?.clubs || []).length} Clubs
                              </span>
                            </div>

                            {(dept?.clubs || []).length === 0 ? (
                              <p className="text-sm text-slate-500 italic">No clubs listed for this department.</p>
                            ) : (
                              <div className="grid gap-3">
                                {(dept.clubs || []).map((club, clubIndex) => (
                                  <div key={clubIndex} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                    <p className="font-bold text-slate-900">{club?.name || 'Unnamed Club'}</p>
                                    <p className="text-sm text-slate-600 mt-1">{club?.description || 'No club description provided.'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">Select a tab above to view details.</div>
                )
              )}
              
              {!isInstitutional && tab === 'education' && (
                <div className="space-y-6">
                  {user.education?.length > 0 ? user.education.map((edu, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center shrink-0 border border-primary-100">
                        <GraduationCap className="w-6 h-6 text-primary-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                        <p className="text-slate-600 text-sm">{edu.institution}</p>
                        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{edu.year}</p>
                      </div>
                    </div>
                  )) : <p className="text-slate-400 italic">No education history provided.</p>}
                </div>
              )}

              {!isInstitutional && tab === 'experience' && (
                <div className="space-y-8">
                  {user.experience?.length > 0 ? user.experience.map((exp, i) => (
                    <div key={i} className="flex gap-4 relative">
                      {i < user.experience.length - 1 && <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-slate-100" />}
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{exp.title}</h4>
                        <p className="text-slate-600 font-medium">{exp.company}</p>
                        <p className="text-xs font-bold text-primary-600 mt-1 uppercase tracking-widest">
                          {exp.from} — {exp.current ? 'Present' : exp.to}
                        </p>
                      </div>
                    </div>
                  )) : <p className="text-slate-400 italic">No professional experience listed.</p>}
                </div>
              )}

              {!isInstitutional && tab === 'publications' && (
                <div className="space-y-4">
                  {user.publications?.length > 0 ? user.publications.map((pub, i) => (
                    <div key={i} className="p-5 bg-white/60 border border-slate-100 rounded-2xl flex items-start justify-between group hover:border-primary-200 transition-all">
                      <div className="flex gap-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0 border border-indigo-100">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{pub.title}</h4>
                          <p className="text-sm text-slate-600">{pub.journal} • {pub.year}</p>
                        </div>
                      </div>
                      {pub.link && (
                        <a href={pub.link} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  )) : <p className="text-slate-400 italic">No publications to show.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
