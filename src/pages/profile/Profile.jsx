import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar, uploadCertificate, deleteAccount } from '../../api/profile';
import { Camera, CheckCircle2, Clock, XCircle, Info, GraduationCap, Paperclip, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

const SKILL_SUGGESTIONS = ['React','Python','Machine Learning','Data Science','Research','Teaching','JavaScript','Firebase','Java','C++','Deep Learning','NLP'];

export default function Profile() {
  const { currentUser, userData, setUserData, logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef();
  const certRef = useRef();

  // Form state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [education, setEducation] = useState([]);
  const [experience, setExperience] = useState([]);
  const [publications, setPublications] = useState([]);
  const [certDegree, setCertDegree] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userData) {
      setName(userData.name || '');
      setBio(userData.bio || '');
      setSkills(userData.skills || []);
      setEducation(userData.education || []);
      setExperience(userData.experience || []);
      setPublications(userData.publications || []);
    }
  }, [userData]);

  const save = async (data) => {
    setSaving(true); setMsg('');
    try {
      await updateProfile(currentUser.uid, data);
      setMsg('Saved successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('WARNING: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.')) return;
    try {
      await deleteAccount();
      await logout();
    } catch (err) {
      alert('Failed to delete account. Please try again.');
    }
  };

  const handleAvatarChange = async (e) => {
    if (!e.target.files[0]) return;
    setUploading(true);
    try { await uploadAvatar(currentUser.uid, e.target.files[0]); setMsg('Photo updated'); setTimeout(() => setMsg(''), 3000); }
    catch { setMsg('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleCertUpload = async (e) => {
    if (!e.target.files[0] || !certDegree) { alert('Enter degree name first'); return; }
    setUploading(true);
    try { await uploadCertificate(currentUser.uid, e.target.files[0], certDegree); setMsg('Certificate uploaded — pending review'); setCertDegree(''); setTimeout(() => setMsg(''), 4000); }
    catch { setMsg('Upload failed'); }
    finally { setUploading(false); }
  };

  const addSkill = () => {
    if (skillInput && !skills.includes(skillInput)) {
      setSkills([...skills, skillInput]);
      setSkillInput('');
    }
  };

  const addEdu = () => setEducation([...education, { degree:'', institution:'', year:'' }]);
  const addExp = () => setExperience([...experience, { title:'', company:'', from:'', to:'', current:false }]);
  const addPub = () => setPublications([...publications, { title:'', journal:'', year:'', link:'' }]);

  const tabs = ['overview', 'skills', 'education', 'experience', 'publications', 'certificates'];

  return (
    <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-12">
      {/* Header card */}
      <div className="relative glass-panel rounded-[2rem] p-8 border border-white/60 overflow-hidden shadow-lg">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary-500 via-indigo-500 to-purple-500 opacity-20" />
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent to-white" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 mt-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-400 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name||'U')}&background=3b82f6&color=fff&size=120`}
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-xl"
              alt="avatar"
            />
            <button
              onClick={() => fileRef.current.click()}
              className="absolute bottom-1 right-1 bg-white text-primary-600 rounded-full w-9 h-9 flex items-center justify-center text-sm shadow-lg hover:scale-110 transition-transform hover:bg-primary-50 border border-slate-100"
              title="Change photo"
            >
              {uploading ? <Clock className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          
          <div className="flex-1 text-center md:text-left mb-2">
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{userData?.name}</h2>
            <p className="text-slate-500 font-medium mb-3">{userData?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1.5 rounded-full capitalize font-semibold shadow-sm border border-primary-200">
                {userData?.role?.replace('_',' ')}
              </span>
              {userData?.verifiedBadge && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-semibold shadow-sm border border-emerald-200 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Verified
                </span>
              )}
              {userData?.accountStatus === 'pending' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full font-semibold shadow-sm border border-amber-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Pending Approval
                </span>
              )}
            </div>
          </div>

          {/* Resume Download placeholder */}
          <div className="mb-2">
            <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Resume PDF
            </button>
          </div>
        </div>
        
        {/* Toast message inside the card */}
        <div className={`absolute top-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 ${msg ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
          {msg.includes('failed') ? <XCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {msg}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel rounded-[2rem] shadow-sm overflow-hidden border border-white/60">
        {/* Custom Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200/50 custom-scrollbar bg-white/40">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-4 text-sm font-semibold whitespace-nowrap capitalize transition-all duration-300 relative ${tab === t ? 'text-primary-600' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'}`}
            >
              {t}
              {tab === t && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full shadow-[0_-2px_10px_rgba(37,99,235,0.5)]" />
              )}
            </button>
          ))}
        </div>

        <div className="p-6 md:p-8 bg-white/20">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6 max-w-2xl animate-slide-up">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Display Name</label>
                <input 
                  className="w-full bg-white/60 border border-slate-200 text-slate-900 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none shadow-sm" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">Bio</label>
                <textarea 
                  rows={5} 
                  className="w-full bg-white/60 border border-slate-200 text-slate-900 p-3.5 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none shadow-sm" 
                  value={bio} 
                  onChange={e => setBio(e.target.value)} 
                  placeholder="Tell the community about yourself..." 
                />
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <button 
                  onClick={() => save({ name, bio })} 
                  disabled={saving} 
                  className="w-full sm:w-auto bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 disabled:opacity-50 hover:shadow-lg transition-all"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <div className="w-full sm:w-auto mt-6 sm:mt-0 pt-6 sm:pt-0 border-t border-slate-200 sm:border-t-0 flex justify-end">
                  <button 
                    onClick={handleDeleteAccount}
                    className="w-full sm:w-auto bg-red-50 text-red-600 px-6 py-3 rounded-xl font-bold border border-red-200 hover:bg-red-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-5 h-5" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SKILLS */}
          {tab === 'skills' && (
            <div className="space-y-6 max-w-2xl animate-slide-up">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    className="w-full bg-white/60 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none shadow-sm"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Type a skill and press Enter..."
                    list="skill-suggestions"
                  />
                  <datalist id="skill-suggestions">
                    {SKILL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
                <button 
                  onClick={addSkill} 
                  className="bg-slate-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-800 shadow-md transition-all"
                >
                  Add
                </button>
              </div>
              
              <div className="bg-white/40 border border-slate-100 rounded-2xl p-6 min-h-[120px]">
                {skills.length === 0 ? (
                  <p className="text-slate-400 text-center py-4 text-sm font-medium">No skills added yet</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {skills.map((s,i) => (
                      <span key={i} className="group bg-white border border-primary-100 text-primary-800 px-4 py-1.5 rounded-full text-sm font-medium shadow-sm flex items-center gap-2 hover:border-primary-300 transition-colors">
                        {s}
                        <button 
                          onClick={() => setSkills(skills.filter((_,j)=>j!==i))} 
                          className="text-primary-300 hover:text-red-500 transition-colors focus:outline-none"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <button 
                  onClick={() => save({ skills })} 
                  disabled={saving} 
                  className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all"
                >
                  {saving ? 'Saving...' : 'Save Skills'}
                </button>
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {tab === 'education' && (
            <div className="space-y-6 animate-slide-up max-w-3xl">
              {education.map((edu, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm relative group transition-all hover:border-primary-100 hover:shadow-md">
                  <button 
                    onClick={() => setEducation(education.filter((_,j)=>j!==i))} 
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Degree / Certification</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. B.Tech Computer Science" value={edu.degree} onChange={e => { const arr=[...education]; arr[i].degree=e.target.value; setEducation(arr); }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Institution</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. Global Institute of Technology" value={edu.institution} onChange={e => { const arr=[...education]; arr[i].institution=e.target.value; setEducation(arr); }} />
                    </div>
                    <div className="w-1/2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Timeline</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. 2020 - 2024" value={edu.year} onChange={e => { const arr=[...education]; arr[i].year=e.target.value; setEducation(arr); }} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2">
                <button onClick={addEdu} className="border-2 border-dashed border-primary-200 text-primary-600 bg-primary-50/50 hover:bg-primary-50 font-semibold px-6 py-3 rounded-xl transition-colors">
                  + Add Education
                </button>
                <button onClick={() => save({ education })} disabled={saving} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all">
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          )}

          {/* EXPERIENCE */}
          {tab === 'experience' && (
            <div className="space-y-6 animate-slide-up max-w-3xl">
              {experience.map((exp, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm relative group transition-all hover:border-primary-100 hover:shadow-md">
                  <button 
                    onClick={() => setExperience(experience.filter((_,j)=>j!==i))} 
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Job Title</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. Senior Researcher" value={exp.title} onChange={e => { const arr=[...experience]; arr[i].title=e.target.value; setExperience(arr); }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Organisation / Company</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. National Science Institute" value={exp.company} onChange={e => { const arr=[...experience]; arr[i].company=e.target.value; setExperience(arr); }} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Start Date</label>
                        <input type="month" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" value={exp.from} onChange={e => { const arr=[...experience]; arr[i].from=e.target.value; setExperience(arr); }} />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">End Date</label>
                        <input type="month" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none disabled:opacity-50 disabled:bg-slate-100" value={exp.to} disabled={exp.current} onChange={e => { const arr=[...experience]; arr[i].to=e.target.value; setExperience(arr); }} />
                      </div>
                    </div>
                    <div className="pt-2">
                      <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                        <div className="relative flex items-center">
                          <input type="checkbox" className="w-5 h-5 border-slate-300 rounded text-primary-600 focus:ring-primary-500" checked={exp.current} onChange={e => { const arr=[...experience]; arr[i].current=e.target.checked; if(e.target.checked)arr[i].to=''; setExperience(arr); }} />
                        </div>
                        Currently working here
                      </label>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2">
                <button onClick={addExp} className="border-2 border-dashed border-primary-200 text-primary-600 bg-primary-50/50 hover:bg-primary-50 font-semibold px-6 py-3 rounded-xl transition-colors">
                  + Add Experience
                </button>
                <button onClick={() => save({ experience })} disabled={saving} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all">
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          )}

          {/* PUBLICATIONS */}
          {tab === 'publications' && (
            <div className="space-y-6 animate-slide-up max-w-3xl">
              {publications.map((pub, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 md:p-6 shadow-sm relative group transition-all hover:border-primary-100 hover:shadow-md">
                  <button 
                    onClick={() => setPublications(publications.filter((_,j)=>j!==i))} 
                    className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Title of Publication</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. A novel approach to AI detection" value={pub.title} onChange={e => { const arr=[...publications]; arr[i].title=e.target.value; setPublications(arr); }} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Journal / Conference</label>
                      <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. IEEE Transactions" value={pub.journal} onChange={e => { const arr=[...publications]; arr[i].journal=e.target.value; setPublications(arr); }} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">Year</label>
                        <input type="number" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="e.g. 2024" value={pub.year} onChange={e => { const arr=[...publications]; arr[i].year=e.target.value; setPublications(arr); }} />
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1 mb-1 block">DOI / URL</label>
                        <input className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none" placeholder="https://..." value={pub.link} onChange={e => { const arr=[...publications]; arr[i].link=e.target.value; setPublications(arr); }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-2">
                <button onClick={addPub} className="border-2 border-dashed border-primary-200 text-primary-600 bg-primary-50/50 hover:bg-primary-50 font-semibold px-6 py-3 rounded-xl transition-colors">
                  + Add Publication
                </button>
                <button onClick={() => save({ publications })} disabled={saving} className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:bg-primary-700 disabled:opacity-50 transition-all">
                  {saving ? 'Saving...' : 'Save All'}
                </button>
              </div>
            </div>
          )}

          {/* CERTIFICATES */}
          {tab === 'certificates' && (
            <div className="space-y-6 animate-slide-up max-w-2xl">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-medium leading-relaxed">
                  Upload your degree certificates to receive a verified badge on your profile. The Platform Admin will review the documents within 48 hours.
                </p>
              </div>

              <div className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-2xl p-8 hover:bg-slate-50 transition-colors flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-3xl mb-4 border border-slate-100">
                  <GraduationCap className="w-8 h-8 text-primary-500" />
                </div>
                <div className="w-full max-w-md space-y-4">
                  <input
                    className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all outline-none shadow-sm text-center"
                    placeholder="Enter Degree Name (e.g. B.Tech CS - MIT)"
                    value={certDegree}
                    onChange={e => setCertDegree(e.target.value)}
                  />
                  <button
                    onClick={() => certRef.current.click()}
                    disabled={uploading || !certDegree}
                    className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Uploading...</>
                    ) : (
                      <><Paperclip className="w-5 h-5" /> Choose File to Upload</>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 font-medium">Supported formats: PDF, JPG, PNG</p>
                </div>
                <input ref={certRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleCertUpload} />
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 px-1">Uploaded Certificates</h3>
                <div className="space-y-3">
                  {(userData?.certificates || []).map((cert, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl border border-slate-200">
                          {cert.fileName?.endsWith('.pdf') ? <FileText className="w-5 h-5 text-slate-500" /> : <ImageIcon className="w-5 h-5 text-slate-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{cert.degree}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{cert.fileName}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-bold shadow-sm border flex items-center gap-1.5 ${
                        cert.status === 'verified' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        cert.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {cert.status === 'verified' ? <><CheckCircle2 className="w-3.5 h-3.5" /> Verified</> : cert.status === 'rejected' ? <><XCircle className="w-3.5 h-3.5" /> Rejected</> : <><Clock className="w-3.5 h-3.5" /> Pending</>}
                      </span>
                    </div>
                  ))}
                  {(userData?.certificates||[]).length === 0 && (
                    <div className="bg-white/60 border border-slate-200 rounded-xl p-8 text-center border-dashed">
                      <p className="text-slate-400 font-medium text-sm">No certificates uploaded yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
