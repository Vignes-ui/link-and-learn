import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createVacancy, subscribeVacancies, applyForVacancy, getMyVacancies } from '../../api/recruitment';

const ROLE_TYPES = ['Faculty', 'PhD', 'Research', 'Staff', 'Internship'];
const CAN_POST = ['institution', 'govt_body', 'ngo', 'admin'];
const CAN_APPLY = ['student', 'researcher'];

export default function RecruitmentPage() {
  const { currentUser, userData } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [myVacancies, setMyVacancies] = useState([]);
  const [view, setView] = useState('browse');
  const [selected, setSelected] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  // Form
  const [form, setForm] = useState({ role: '', roleType: 'Faculty', department: '', eligibility: '', description: '', deadline: '' });
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState('');

  const canPost = CAN_POST.includes(userData?.role);
  const canApply = CAN_APPLY.includes(userData?.role);

  useEffect(() => {
    const unsub = subscribeVacancies(setVacancies);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view === 'mine' && canPost) {
      getMyVacancies().then(setMyVacancies);
    }
  }, [view, canPost]);

  const handlePost = async (e) => {
    e.preventDefault();
    setPosting(true); setMsg('');
    try {
      await createVacancy(currentUser.uid, userData, form);
      setMsg('✅ Vacancy posted! Matching candidates will be notified.');
      setForm({ role: '', roleType: 'Faculty', department: '', eligibility: '', description: '', deadline: '' });
    } catch { setMsg('❌ Failed to post vacancy'); }
    finally { setPosting(false); }
  };

  const handleApply = async (vacancyId) => {
    setApplying(true); setApplyMsg('');
    try {
      await applyForVacancy(vacancyId, { uid: currentUser.uid, name: userData.name, email: userData.email, role: userData.role });
      setApplyMsg('✅ Application submitted!');
    } catch (e) { setApplyMsg('❌ ' + e.message); }
    finally { setApplying(false); }
  };

  if (selected) {
    const alreadyApplied = selected.applicants?.some(a => a.uid === currentUser.uid);
    return (
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setSelected(null); setApplyMsg(''); }} className="text-blue-600 text-sm mb-4 hover:underline">← Back to vacancies</button>
        <div className="bg-white rounded-2xl shadow p-8 space-y-4">
          <div>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{selected.roleType}</span>
            <h1 className="text-2xl font-bold mt-2">{selected.role}</h1>
            <p className="text-gray-500 text-sm mt-1">{selected.institutionName} · {selected.department}</p>
            <p className="text-xs text-gray-400 mt-1">Deadline: {selected.deadline}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Description</h3>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{selected.description}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">Eligibility Criteria</h3>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{selected.eligibility}</p>
          </div>
          {applyMsg && <div className={`rounded-lg p-3 text-sm ${applyMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{applyMsg}</div>}
          {canApply && (
            <button
              onClick={() => handleApply(selected.id)}
              disabled={applying || alreadyApplied}
              className={`px-6 py-3 rounded-lg font-medium ${alreadyApplied ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
            >
              {alreadyApplied ? '✅ Already Applied' : applying ? 'Submitting...' : 'Apply Now'}
            </button>
          )}
          {!canApply && !canPost && <p className="text-gray-500 text-sm">Log in as a student or researcher to apply.</p>}
          {canPost && selected.uid === currentUser.uid && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Applications ({selected.applicants?.length || 0})</h3>
              {(selected.applicants || []).map((a, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 mb-2">
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.email} · {a.role}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'shortlisted' ? 'bg-green-100 text-green-700' : a.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">💼 Recruitment</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'browse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Browse</button>
          {canPost && <button onClick={() => setView('post')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'post' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>📢 Post Vacancy</button>}
          {canPost && <button onClick={() => setView('mine')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'mine' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>My Postings</button>}
        </div>
      </div>

      {view === 'browse' && (
        <div className="space-y-4">
          {vacancies.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-3">💼</p>
              <p>No open vacancies right now.</p>
            </div>
          )}
          {vacancies.map(v => (
            <div key={v.id} onClick={() => setSelected(v)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{v.roleType}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{v.department}</span>
                  </div>
                  <h2 className="font-bold text-gray-900">{v.role}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{v.institutionName}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{v.description?.slice(0, 150)}...</p>
                </div>
                <div className="text-right text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  <p>Deadline</p>
                  <p className="font-medium text-gray-700 mt-0.5">{v.deadline}</p>
                  <p className="mt-2 text-blue-600 font-medium">{v.applicants?.length || 0} applied</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'post' && canPost && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Post a Vacancy</h2>
          {msg && <div className={`rounded-lg p-3 text-sm mb-4 ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
          <form onSubmit={handlePost} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input className="border border-gray-300 p-3 rounded-lg" placeholder="Role Title" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} required />
              <select className="border border-gray-300 p-3 rounded-lg" value={form.roleType} onChange={e => setForm(f => ({...f, roleType: e.target.value}))}>
                {ROLE_TYPES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Department" value={form.department} onChange={e => setForm(f => ({...f, department: e.target.value}))} />
            <textarea className="w-full border border-gray-300 p-3 rounded-lg resize-none" rows={3} placeholder="Job Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            <textarea className="w-full border border-gray-300 p-3 rounded-lg resize-none" rows={3} placeholder="Eligibility Criteria" value={form.eligibility} onChange={e => setForm(f => ({...f, eligibility: e.target.value}))} />
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Application Deadline</label>
              <input type="date" className="border border-gray-300 p-3 rounded-lg" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} required />
            </div>
            <button type="submit" disabled={posting} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {posting ? 'Posting...' : 'Post Vacancy'}
            </button>
          </form>
        </div>
      )}

      {view === 'mine' && canPost && (
        <div className="space-y-3">
          {myVacancies.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">No vacancies posted yet.</div>}
          {myVacancies.map(v => (
            <div key={v.id} onClick={() => setSelected(v)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <p className="font-bold">{v.role}</p>
                <p className="text-sm text-gray-500">{v.roleType} · {v.department}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">{v.applicants?.length || 0} applicants</p>
                <span className={`text-xs px-2 py-1 rounded-full ${v.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{v.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
