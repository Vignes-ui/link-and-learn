import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, uploadAvatar, uploadCertificate } from '../../api/profile';

const SKILL_SUGGESTIONS = ['React','Python','Machine Learning','Data Science','Research','Teaching','JavaScript','Firebase','Java','C++','Deep Learning','NLP'];

export default function Profile() {
  const { currentUser, userData, setUserData } = useAuth();
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
      setMsg('✅ Saved successfully');
    } catch { setMsg('❌ Save failed'); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    if (!e.target.files[0]) return;
    setUploading(true);
    try { await uploadAvatar(currentUser.uid, e.target.files[0]); setMsg('✅ Photo updated'); }
    catch { setMsg('❌ Upload failed'); }
    finally { setUploading(false); }
  };

  const handleCertUpload = async (e) => {
    if (!e.target.files[0] || !certDegree) { alert('Enter degree name first'); return; }
    setUploading(true);
    try { await uploadCertificate(currentUser.uid, e.target.files[0], certDegree); setMsg('✅ Certificate uploaded — pending review'); setCertDegree(''); }
    catch { setMsg('❌ Upload failed'); }
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <img
              src={userData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name||'U')}&background=3b82f6&color=fff&size=80`}
              className="w-20 h-20 rounded-full object-cover border-4 border-blue-100"
              alt="avatar"
            />
            <button
              onClick={() => fileRef.current.click()}
              className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-blue-700"
              title="Change photo"
            >✏️</button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{userData?.name}</h2>
            <p className="text-gray-500 text-sm">{userData?.email}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full capitalize">{userData?.role?.replace('_',' ')}</span>
              {userData?.verifiedBadge && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Verified</span>}
              {userData?.accountStatus === 'pending' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">⏳ Pending Approval</span>}
            </div>
          </div>
        </div>
        {msg && <p className="mt-3 text-sm text-center text-blue-600">{msg}</p>}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="flex overflow-x-auto border-b">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap capitalize transition-colors ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input className="w-full border border-gray-300 p-3 rounded-lg" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea rows={4} className="w-full border border-gray-300 p-3 rounded-lg resize-none" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell the community about yourself..." />
              </div>
              <button onClick={() => save({ name, bio })} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* SKILLS */}
          {tab === 'skills' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-300 p-3 rounded-lg"
                  value={skillInput}
                  onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="Add a skill..."
                  list="skill-suggestions"
                />
                <datalist id="skill-suggestions">
                  {SKILL_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                </datalist>
                <button onClick={addSkill} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Add</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((s,i) => (
                  <span key={i} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {s}
                    <button onClick={() => setSkills(skills.filter((_,j)=>j!==i))} className="text-blue-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <button onClick={() => save({ skills })} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Skills'}
              </button>
            </div>
          )}

          {/* EDUCATION */}
          {tab === 'education' && (
            <div className="space-y-4">
              {education.map((edu, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                  <button onClick={() => setEducation(education.filter((_,j)=>j!==i))} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">🗑</button>
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Degree (e.g. B.Tech Computer Science)" value={edu.degree} onChange={e => { const arr=[...education]; arr[i].degree=e.target.value; setEducation(arr); }} />
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Institution" value={edu.institution} onChange={e => { const arr=[...education]; arr[i].institution=e.target.value; setEducation(arr); }} />
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Year (e.g. 2020-2024)" value={edu.year} onChange={e => { const arr=[...education]; arr[i].year=e.target.value; setEducation(arr); }} />
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addEdu} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm">+ Add Education</button>
                <button onClick={() => save({ education })} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* EXPERIENCE */}
          {tab === 'experience' && (
            <div className="space-y-4">
              {experience.map((exp, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                  <button onClick={() => setExperience(experience.filter((_,j)=>j!==i))} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">🗑</button>
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Job Title" value={exp.title} onChange={e => { const arr=[...experience]; arr[i].title=e.target.value; setExperience(arr); }} />
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Organisation / Company" value={exp.company} onChange={e => { const arr=[...experience]; arr[i].company=e.target.value; setExperience(arr); }} />
                  <div className="flex gap-2">
                    <input type="month" className="flex-1 border border-gray-300 p-2 rounded-lg text-sm" value={exp.from} onChange={e => { const arr=[...experience]; arr[i].from=e.target.value; setExperience(arr); }} placeholder="From" />
                    <input type="month" className="flex-1 border border-gray-300 p-2 rounded-lg text-sm" value={exp.to} disabled={exp.current} onChange={e => { const arr=[...experience]; arr[i].to=e.target.value; setExperience(arr); }} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" checked={exp.current} onChange={e => { const arr=[...experience]; arr[i].current=e.target.checked; if(e.target.checked)arr[i].to=''; setExperience(arr); }} />
                    Currently working here
                  </label>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addExp} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm">+ Add Experience</button>
                <button onClick={() => save({ experience })} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* PUBLICATIONS */}
          {tab === 'publications' && (
            <div className="space-y-4">
              {publications.map((pub, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                  <button onClick={() => setPublications(publications.filter((_,j)=>j!==i))} className="absolute top-3 right-3 text-gray-400 hover:text-red-500">🗑</button>
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Title of publication" value={pub.title} onChange={e => { const arr=[...publications]; arr[i].title=e.target.value; setPublications(arr); }} />
                  <input className="w-full border border-gray-300 p-2 rounded-lg text-sm" placeholder="Journal / Conference" value={pub.journal} onChange={e => { const arr=[...publications]; arr[i].journal=e.target.value; setPublications(arr); }} />
                  <div className="flex gap-2">
                    <input type="number" className="w-24 border border-gray-300 p-2 rounded-lg text-sm" placeholder="Year" value={pub.year} onChange={e => { const arr=[...publications]; arr[i].year=e.target.value; setPublications(arr); }} />
                    <input className="flex-1 border border-gray-300 p-2 rounded-lg text-sm" placeholder="DOI / URL (optional)" value={pub.link} onChange={e => { const arr=[...publications]; arr[i].link=e.target.value; setPublications(arr); }} />
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={addPub} className="border border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 text-sm">+ Add Publication</button>
                <button onClick={() => save({ publications })} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {/* CERTIFICATES */}
          {tab === 'certificates' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Upload your degree certificates for verification. Approved certificates display a verified badge on your profile.</p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 space-y-3">
                <input
                  className="w-full border border-gray-300 p-3 rounded-lg"
                  placeholder="Degree name (e.g. B.Tech Computer Science - MIT 2024)"
                  value={certDegree}
                  onChange={e => setCertDegree(e.target.value)}
                />
                <button
                  onClick={() => certRef.current.click()}
                  disabled={uploading || !certDegree}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {uploading ? 'Uploading...' : '📎 Upload Certificate (PDF/Image)'}
                </button>
                <input ref={certRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleCertUpload} />
              </div>
              <div className="space-y-2">
                {(userData?.certificates || []).map((cert, i) => (
                  <div key={i} className="flex items-center justify-between border border-gray-200 rounded-xl p-3">
                    <div>
                      <p className="font-medium text-sm">{cert.degree}</p>
                      <p className="text-xs text-gray-500">{cert.fileName}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      cert.status === 'verified' ? 'bg-green-100 text-green-700' :
                      cert.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {cert.status === 'verified' ? '✅ Verified' : cert.status === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
                {(userData?.certificates||[]).length === 0 && <p className="text-gray-400 text-sm text-center py-4">No certificates uploaded yet</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
