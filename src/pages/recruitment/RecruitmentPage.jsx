import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createVacancy, subscribeVacancies, applyForVacancy, getMyVacancies } from '../../api/recruitment';
import { Briefcase, Search, PlusCircle, Users, CheckCircle2, AlertTriangle, Send, FileText, CheckCircle, ClipboardList, SendHorizonal } from 'lucide-react';

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
      setTimeout(() => setMsg(''), 5000);
    } catch { setMsg('❌ Failed to post vacancy'); }
    finally { setPosting(false); }
  };

  const handleApply = async (vacancyId) => {
    setApplying(true); setApplyMsg('');
    try {
      await applyForVacancy(vacancyId, { uid: currentUser.uid, name: userData.name, email: userData.email, role: userData.role });
      setApplyMsg('✅ Application submitted successfully!');
    } catch (e) { setApplyMsg('❌ ' + e.message); }
    finally { setApplying(false); }
  };

  if (selected) {
    const alreadyApplied = selected.applicants?.some(a => a.uid === currentUser.uid);
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-12">
        <button onClick={() => { setSelected(null); setApplyMsg(''); }} className="group flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold mb-6 transition-colors">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to vacancies
        </button>
        
        <div className="glass-panel rounded-[2rem] shadow-sm border border-white/60 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-[80px] opacity-50 -z-10 translate-x-1/3 -translate-y-1/3" />
          
          <div className="p-8 sm:p-10 border-b border-slate-100">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 shadow-sm">{selected.roleType}</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${selected.status === 'open' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {selected.status === 'open' ? <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Accepting Applications</> : <><span className="w-2 h-2 rounded-full bg-slate-400"></span> Closed</>}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 mb-2">{selected.role}</h1>
            <p className="text-lg text-slate-600 font-medium">{selected.institutionName} <span className="opacity-50 mx-2">•</span> {selected.department}</p>
            
            <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-amber-600 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200 inline-flex shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Apply by: {new Date(selected.deadline).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          
          <div className="p-8 sm:p-10 space-y-8 bg-white/40">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" /> Description
              </h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
            </div>
            
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" /> Eligibility Criteria
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.eligibility}</p>
              </div>
            </div>
            
            {applyMsg && (
              <div className={`rounded-xl p-4 text-sm font-medium border flex items-center gap-3 animate-fade-in shadow-sm ${applyMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {applyMsg.startsWith('✅') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                {applyMsg.replace('✅ ', '').replace('❌ ', '')}
              </div>
            )}
            
            {canApply && selected.status === 'open' && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleApply(selected.id)}
                  disabled={applying || alreadyApplied}
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-2 ${alreadyApplied ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed border border-emerald-200 shadow-none' : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg disabled:opacity-50'}`}
                >
                  {alreadyApplied ? (
                    <><CheckCircle2 className="w-5 h-5" /> Application Submitted</>
                  ) : applying ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Submitting...</>
                  ) : (
                    <>Apply Now <Send className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            )}
            {!canApply && !canPost && (
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-slate-600 font-medium text-sm">You must log in as a student or researcher to apply for vacancies.</p>
              </div>
            )}
            
            {canPost && selected.uid === currentUser.uid && (
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-500" /> Applicants
                    <span className="bg-slate-200 text-slate-700 text-xs py-1 px-2.5 rounded-full ml-2">{selected.applicants?.length || 0}</span>
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {(selected.applicants || []).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
                      <p className="text-slate-500 font-medium">No applications received yet.</p>
                    </div>
                  ) : (
                    (selected.applicants || []).map((a, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow gap-4">
                        <div className="flex items-center gap-4">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=e2e8f0&color=475569&size=40`} className="w-10 h-10 rounded-full" alt="" />
                          <div>
                            <p className="font-bold text-slate-900">{a.name}</p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5">{a.email} <span className="mx-1">•</span> <span className="capitalize">{a.role.replace('_',' ')}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm ${
                            a.status === 'shortlisted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                            a.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 
                            'bg-blue-100 text-blue-700 border-blue-200'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary-500 rounded-full blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2" />
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Recruitment Hub <Briefcase className="w-8 h-8 text-primary-300" />
          </h1>
          <p className="text-slate-300 font-medium">Discover opportunities or find the perfect candidate.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative z-10 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
          <button 
            onClick={() => setView('browse')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'browse' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            Browse
          </button>
          {canPost && (
            <button 
              onClick={() => setView('post')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'post' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              Post Vacancy
            </button>
          )}
          {canPost && (
            <button 
              onClick={() => setView('mine')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'mine' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              My Postings
            </button>
          )}
        </div>
      </div>

      {view === 'browse' && (
        <div className="space-y-6 animate-slide-up">
          {vacancies.length === 0 && (
            <div className="text-center py-24 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-200 shadow-inner">
                <Search className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No open vacancies</h3>
              <p className="text-slate-500 font-medium">Check back later for new opportunities.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            {vacancies.map((v, idx) => (
              <div 
                key={v.id} 
                onClick={() => setSelected(v)} 
                className="glass-panel rounded-[2rem] p-6 sm:p-8 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-white/60 group relative overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                
                <div className="flex flex-col h-full">
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full border border-purple-200 shadow-sm">{v.roleType}</span>
                    <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">{v.department}</span>
                  </div>
                  
                  <h2 className="text-2xl font-display font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight">{v.role}</h2>
                  <p className="text-base font-semibold text-slate-600 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                    {v.institutionName}
                  </p>
                  
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-6 flex-1">
                    {v.description}
                  </p>
                  
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      {new Date(v.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      {v.applicants?.length || 0} Applied
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'post' && canPost && (
        <div className="max-w-3xl mx-auto glass-panel rounded-[2rem] shadow-lg p-8 sm:p-10 border border-white/60 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-100 rounded-full blur-[80px] opacity-40 -z-10" />
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center border border-primary-200 shadow-sm"><PlusCircle className="w-5 h-5" /></span>
            Post a New Vacancy
          </h2>
          
          {msg && (
            <div className={`rounded-xl p-4 text-sm font-medium border mb-8 flex items-center gap-3 shadow-sm ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {msg.startsWith('✅') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {msg.replace('✅ ', '').replace('❌ ', '')}
            </div>
          )}
          
          <form onSubmit={handlePost} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Role Title</label>
                <input 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all" 
                  placeholder="e.g. Associate Professor" 
                  value={form.role} 
                  onChange={e => setForm(f => ({...f, role: e.target.value}))} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Role Type</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all cursor-pointer" 
                    value={form.roleType} 
                    onChange={e => setForm(f => ({...f, roleType: e.target.value}))}
                  >
                    {ROLE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Department</label>
              <input 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all" 
                placeholder="e.g. Computer Science and Engineering" 
                value={form.department} 
                onChange={e => setForm(f => ({...f, department: e.target.value}))} 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Job Description</label>
              <textarea 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all resize-none" 
                rows={4} 
                placeholder="Describe the responsibilities, expectations, and environment..." 
                value={form.description} 
                onChange={e => setForm(f => ({...f, description: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Eligibility Criteria</label>
              <textarea 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all resize-none" 
                rows={3} 
                placeholder="List required qualifications, experience, and skills..." 
                value={form.eligibility} 
                onChange={e => setForm(f => ({...f, eligibility: e.target.value}))} 
              />
            </div>
            
            <div className="space-y-2 md:w-1/2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Application Deadline</label>
              <input 
                type="date" 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all" 
                value={form.deadline} 
                onChange={e => setForm(f => ({...f, deadline: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="pt-6">
              <button 
                type="submit" 
                disabled={posting} 
                className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {posting ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Publishing...</>
                ) : (
                  <>Post Vacancy <SendHorizonal className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'mine' && canPost && (
        <div className="space-y-4 animate-slide-up">
          {myVacancies.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-slate-200">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-700">No vacancies posted yet.</p>
              <button onClick={() => setView('post')} className="mt-4 text-primary-600 font-semibold hover:underline">Post your first vacancy →</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myVacancies.map((v, idx) => (
                <div 
                  key={v.id} 
                  onClick={() => setSelected(v)} 
                  className="glass-panel rounded-2xl p-5 sm:p-6 cursor-pointer hover:shadow-md transition-all border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center text-xl shadow-sm border border-primary-100 group-hover:scale-110 transition-transform flex-shrink-0">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-600 transition-colors">{v.role}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{v.roleType} <span className="mx-2 opacity-50">•</span> {v.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-3 pl-16 sm:pl-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      <span className="text-sm font-bold text-blue-700">{v.applicants?.length || 0}</span>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Applicants</span>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm ${v.status === 'open' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {v.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
