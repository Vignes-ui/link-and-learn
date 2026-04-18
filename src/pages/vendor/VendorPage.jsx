import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postRequirement, subscribeRequirements, submitQuote, getMyRequirements, awardQuote } from '../../api/vendor';
import { ShoppingCart, CheckCircle2, AlertTriangle, FileText, Factory, Clock, MapPin, IndianRupee, Send, Edit, Package, Hash, Box, SendHorizonal, ClipboardList, Inbox, BoxSelect } from 'lucide-react';

const ITEM_TYPES = ['Furniture', 'Lab Equipment', 'IT Infrastructure', 'Office Supplies', 'Maintenance', 'Consumables', 'Construction', 'Other'];
const CAN_POST_REQ = ['institution', 'govt_body', 'ngo', 'admin'];

export default function VendorPage() {
  const { currentUser, userData } = useAuth();
  const [requirements, setRequirements] = useState([]);
  const [myRequirements, setMyRequirements] = useState([]);
  const [view, setView] = useState('browse');
  const [selected, setSelected] = useState(null);

  const [form, setForm] = useState({ itemType: ITEM_TYPES[0], description: '', quantity: '', budgetMin: '', budgetMax: '', deadline: '', location: '' });
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState('');

  const [quote, setQuote] = useState({ price: '', timeline: '', terms: '' });
  const [quoting, setQuoting] = useState(false);
  const [quoteMsg, setQuoteMsg] = useState('');

  const isInstitution = CAN_POST_REQ.includes(userData?.role);
  const isVendor = userData?.role === 'vendor';

  useEffect(() => {
    const unsub = subscribeRequirements(setRequirements);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view === 'mine' && isInstitution) {
      getMyRequirements().then(setMyRequirements);
    }
  }, [view, isInstitution]);

  const handlePost = async (e) => {
    e.preventDefault();
    setPosting(true); setMsg('');
    try {
      await postRequirement(currentUser.uid, userData, form);
      setMsg('✅ Requirement posted! Vendors will be notified.');
      setForm({ itemType: ITEM_TYPES[0], description: '', quantity: '', budgetMin: '', budgetMax: '', deadline: '', location: '' });
      setTimeout(() => setMsg(''), 5000);
    } catch { setMsg('❌ Failed to post requirement'); }
    finally { setPosting(false); }
  };

  const handleQuote = async (requirementId) => {
    setQuoting(true); setQuoteMsg('');
    try {
      await submitQuote(requirementId, { uid: currentUser.uid, name: userData.name, ...quote });
      setQuoteMsg('✅ Quote submitted successfully!');
      setQuote({ price: '', timeline: '', terms: '' });
    } catch (e) { setQuoteMsg('❌ ' + e.message); }
    finally { setQuoting(false); }
  };

  if (selected) {
    const myQuote = selected.quotes?.find(q => q.vendorUid === currentUser.uid);
    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-12">
        <button onClick={() => { setSelected(null); setQuoteMsg(''); }} className="group flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold mb-6 transition-colors">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to marketplace
        </button>
        
        <div className="glass-panel rounded-[2rem] shadow-sm border border-white/60 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-[80px] opacity-40 -z-10 translate-x-1/3 -translate-y-1/3" />
          
          <div className="p-8 sm:p-10 border-b border-slate-100 bg-white/40">
            <div className="flex flex-wrap gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm">{selected.itemType}</span>
              <span className={`text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${selected.status === 'open' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {selected.status === 'open' ? <><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Accepting Quotes</> : <><span className="w-2 h-2 rounded-full bg-slate-400"></span> Closed</>}
              </span>
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2 leading-tight">{selected.description}</h1>
            <p className="text-lg font-medium text-slate-600 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
              {selected.institutionName}
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"><Hash className="w-4 h-4" /> Quantity</span>
                <p className="font-bold text-slate-800 text-lg">{selected.quantity}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"><IndianRupee className="w-4 h-4" /> Budget Range</span>
                <p className="font-bold text-emerald-600 text-lg">₹{selected.budgetMin} - ₹{selected.budgetMax}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"><Clock className="w-4 h-4" /> Deadline</span>
                <p className="font-bold text-slate-800 text-lg">{new Date(selected.deadline).toLocaleDateString()}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-center">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1"><MapPin className="w-4 h-4" /> Location</span>
                <p className="font-bold text-slate-800 text-lg truncate" title={selected.location}>{selected.location}</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 sm:p-10 bg-white/20">
            {/* Vendor: submit quote */}
            {isVendor && !myQuote && selected.status === 'open' && (
              <div className="bg-white border-2 border-primary-100 rounded-3xl p-8 shadow-sm animate-slide-up">
                <h3 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm"><Edit className="w-5 h-5" /></span>
                  Submit Your Quote
                </h3>
                
                {quoteMsg && (
                  <div className={`rounded-xl p-4 text-sm font-medium border mb-6 flex items-center gap-3 shadow-sm ${quoteMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                    {quoteMsg.startsWith('✅') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                    {quoteMsg.replace('✅ ', '').replace('❌ ', '')}
                  </div>
                )}
                
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Total Price (₹)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-8 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all text-lg font-bold" 
                          placeholder="0.00" 
                          value={quote.price} 
                          onChange={e => setQuote(q => ({...q, price: e.target.value}))} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Delivery Timeline</label>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all" 
                        placeholder="e.g. 2 weeks" 
                        value={quote.timeline} 
                        onChange={e => setQuote(q => ({...q, timeline: e.target.value}))} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Terms & Conditions / Notes</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 outline-none shadow-sm transition-all" 
                      rows={3} 
                      placeholder="Include details about warranty, shipping, installation, etc." 
                      value={quote.terms} 
                      onChange={e => setQuote(q => ({...q, terms: e.target.value}))} 
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button 
                      onClick={() => handleQuote(selected.id)} 
                      disabled={quoting || !quote.price} 
                      className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                      {quoting ? (
                        <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Sending...</>
                      ) : (
                        <>Submit Official Quote</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {isVendor && myQuote && (
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-3xl p-8 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl shadow-sm border border-emerald-200 shrink-0"><CheckCircle2 className="w-8 h-8 text-emerald-600" /></div>
                <div>
                  <h3 className="text-xl font-display font-bold text-emerald-900 mb-2">Quote Submitted Successfully</h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-emerald-800 font-medium mb-3">
                    <span className="bg-white/60 px-3 py-1 rounded-lg border border-emerald-200/50">Amount: <span className="font-bold">₹{myQuote.price}</span></span>
                    <span className="bg-white/60 px-3 py-1 rounded-lg border border-emerald-200/50">Timeline: <span className="font-bold">{myQuote.timeline}</span></span>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-emerald-600 mt-4 border-t border-emerald-200/50 pt-4">Status: <span className="px-2 py-1 bg-white rounded shadow-sm ml-1">{myQuote.status}</span></p>
                </div>
              </div>
            )}

            {/* Institution: see quotes */}
            {selected.uid === currentUser.uid && (
              <div>
                <h3 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm"><Inbox className="w-5 h-5" /></span>
                  Quotes Received 
                  <span className="bg-slate-200 text-slate-700 text-sm py-1 px-3 rounded-full">{selected.quotes?.length || 0}</span>
                </h3>
                
                <div className="space-y-4">
                  {(selected.quotes || []).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-10 text-center">
                      <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Waiting for vendors to submit their quotes...</p>
                    </div>
                  ) : (
                    (selected.quotes || []).map((q, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0"><Factory className="w-5 h-5 text-slate-600" /></div>
                              <div>
                                <p className="font-bold text-lg text-slate-900">{q.vendorName}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${q.status === 'awarded' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : q.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                  {q.status}
                                </span>
                              </div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                              <p className="text-sm text-slate-600 leading-relaxed">{q.terms || 'No additional terms provided.'}</p>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 md:w-64 shrink-0 flex flex-col justify-center">
                            <div className="text-center mb-4 pb-4 border-b border-slate-200">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Quoted Price</p>
                              <p className="text-3xl font-display font-bold text-emerald-600">₹{q.price}</p>
                            </div>
                            <div className="text-center mb-4">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Timeline</p>
                              <p className="font-semibold text-slate-800">{q.timeline}</p>
                            </div>
                            
                            {selected.status === 'open' && q.status === 'pending' && (
                              <button 
                                onClick={() => awardQuote(selected.id, q.vendorUid)} 
                                className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-emerald-600 hover:shadow-md transition-all"
                              >
                                Award Contract
                              </button>
                            )}
                          </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-teal-900 to-emerald-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-emerald-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/2" />
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Vendor Marketplace <Factory className="w-8 h-8 text-teal-300" />
          </h1>
          <p className="text-teal-100 font-medium">Connect institutions with trusted suppliers seamlessly.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative z-10 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
          <button 
            onClick={() => setView('browse')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'browse' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            Browse Requests
          </button>
          {isInstitution && (
            <button 
              onClick={() => setView('post')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'post' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              Post Requirement
            </button>
          )}
          {isInstitution && (
            <button 
              onClick={() => setView('mine')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'mine' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              My Requirements
            </button>
          )}
        </div>
      </div>

      {view === 'browse' && (
        <div className="space-y-6 animate-slide-up">
          {requirements.length === 0 && (
            <div className="text-center py-24 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-200 shadow-inner">
                <ShoppingCart className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No active requirements</h3>
              <p className="text-slate-500 font-medium">Check back later for new procurement opportunities.</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-6">
            {requirements.map((req, idx) => (
              <div 
                key={req.id} 
                onClick={() => setSelected(req)} 
                className="glass-panel rounded-[2rem] p-6 sm:p-8 cursor-pointer hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-white/60 group relative overflow-hidden flex flex-col"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm">
                    {req.itemType}
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${req.status === 'open' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {req.status}
                  </span>
                </div>
                
                <h2 className="text-xl font-display font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors leading-snug line-clamp-2">
                  {req.description}
                </h2>
                
                <p className="text-sm font-semibold text-slate-500 mb-6 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <span className="truncate">{req.institutionName} <span className="opacity-50 mx-1">•</span> {req.location}</span>
                </p>
                
                <div className="mt-auto grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Budget</p>
                    <p className="text-sm font-bold text-emerald-600">₹{req.budgetMin} - ₹{req.budgetMax}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Deadline</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(req.deadline).toLocaleDateString([], {month:'short', day:'numeric'})}</p>
                  </div>
                </div>
                
                <div className="absolute top-6 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'post' && isInstitution && (
        <div className="max-w-3xl mx-auto glass-panel rounded-[2rem] shadow-lg p-8 sm:p-10 border border-white/60 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-[80px] opacity-40 -z-10" />
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shadow-sm"><ClipboardList className="w-5 h-5" /></span>
            Post New Requirement
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
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Item Category</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all cursor-pointer font-medium" 
                    value={form.itemType} 
                    onChange={e => setForm(f => ({...f, itemType: e.target.value}))}
                  >
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Quantity / Units</label>
                <input 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" 
                  placeholder="e.g. 50 Laptops, 100kg Chemical" 
                  value={form.quantity} 
                  onChange={e => setForm(f => ({...f, quantity: e.target.value}))} 
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Detailed Description</label>
              <textarea 
                className="w-full bg-white border border-slate-200 p-4 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" 
                rows={4} 
                placeholder="Provide exact specifications, brands, or technical details required..." 
                value={form.description} 
                onChange={e => setForm(f => ({...f, description: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Budget Minimum (₹)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" 
                  placeholder="Min amount" 
                  value={form.budgetMin} 
                  onChange={e => setForm(f => ({...f, budgetMin: e.target.value}))} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Budget Maximum (₹)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" 
                  placeholder="Max amount" 
                  value={form.budgetMax} 
                  onChange={e => setForm(f => ({...f, budgetMax: e.target.value}))} 
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Delivery Location</label>
                <input 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all" 
                  placeholder="e.g. Science Block, Campus A" 
                  value={form.location} 
                  onChange={e => setForm(f => ({...f, location: e.target.value}))} 
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Quotation Deadline</label>
                <input 
                  type="date" 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all text-slate-700" 
                  value={form.deadline} 
                  onChange={e => setForm(f => ({...f, deadline: e.target.value}))} 
                  required 
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={posting} 
                className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {posting ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Publishing...</>
                ) : (
                  <>Broadcast Requirement <SendHorizonal className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'mine' && isInstitution && (
        <div className="space-y-4 animate-slide-up">
          {myRequirements.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-slate-200">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-700 mb-2">No requirements posted yet.</p>
              <button onClick={() => setView('post')} className="text-primary-600 font-semibold hover:underline">Post your first requirement →</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myRequirements.map((req, idx) => (
                <div 
                  key={req.id} 
                  onClick={() => setSelected(req)} 
                  className="glass-panel rounded-2xl p-5 sm:p-6 hover:shadow-md transition-all border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group cursor-pointer"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform flex-shrink-0">
                      <Box className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-600 transition-colors truncate">{req.description}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                        <span>{req.itemType}</span>
                        <span className="opacity-50">•</span>
                        <span>Due {new Date(req.deadline).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-16 sm:pl-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-sm font-bold text-slate-700">{req.quotes?.length || 0}</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quotes</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border shadow-sm ${
                      req.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                      req.status === 'awarded' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {req.status}
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
