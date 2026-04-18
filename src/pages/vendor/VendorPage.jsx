import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { postRequirement, subscribeRequirements, submitQuote, getMyRequirements, awardQuote } from '../../api/vendor';

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
      setMsg('✅ Requirement posted! Vendors will be able to submit quotes.');
      setForm({ itemType: ITEM_TYPES[0], description: '', quantity: '', budgetMin: '', budgetMax: '', deadline: '', location: '' });
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
      <div className="max-w-3xl mx-auto">
        <button onClick={() => { setSelected(null); setQuoteMsg(''); }} className="text-blue-600 text-sm mb-4 hover:underline">← Back</button>
        <div className="bg-white rounded-2xl shadow p-8 space-y-5">
          <div>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{selected.itemType}</span>
            <h1 className="text-xl font-bold mt-2">{selected.description}</h1>
            <p className="text-sm text-gray-500 mt-1">{selected.institutionName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Quantity</p><p className="font-semibold mt-1">{selected.quantity}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Budget</p><p className="font-semibold mt-1">₹{selected.budgetMin} – ₹{selected.budgetMax}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Deadline</p><p className="font-semibold mt-1">{selected.deadline}</p></div>
            <div className="bg-gray-50 rounded-xl p-3"><p className="text-gray-400 text-xs">Location</p><p className="font-semibold mt-1">{selected.location}</p></div>
          </div>

          {/* Vendor: submit quote */}
          {isVendor && !myQuote && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold mb-3">Submit Your Quote</h3>
              {quoteMsg && <div className={`rounded-lg p-3 text-sm mb-3 ${quoteMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{quoteMsg}</div>}
              <div className="space-y-3">
                <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Price (₹)" value={quote.price} onChange={e => setQuote(q => ({...q, price: e.target.value}))} />
                <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Delivery Timeline (e.g. 2 weeks)" value={quote.timeline} onChange={e => setQuote(q => ({...q, timeline: e.target.value}))} />
                <textarea className="w-full border border-gray-300 p-3 rounded-lg resize-none" rows={3} placeholder="Terms & conditions / notes" value={quote.terms} onChange={e => setQuote(q => ({...q, terms: e.target.value}))} />
                <button onClick={() => handleQuote(selected.id)} disabled={quoting || !quote.price} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {quoting ? 'Submitting...' : 'Submit Quote'}
                </button>
              </div>
            </div>
          )}
          {isVendor && myQuote && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="font-semibold text-green-700">✅ You already submitted a quote: ₹{myQuote.price} · {myQuote.timeline}</p>
              <p className="text-sm text-green-600 mt-1">Status: <strong>{myQuote.status}</strong></p>
            </div>
          )}

          {/* Institution: see quotes */}
          {selected.uid === currentUser.uid && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Quotes Received ({selected.quotes?.length || 0})</h3>
              {(selected.quotes || []).length === 0 && <p className="text-gray-400 text-sm">No quotes yet.</p>}
              {(selected.quotes || []).map((q, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold">{q.vendorName}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${q.status === 'awarded' ? 'bg-green-100 text-green-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{q.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">💰 ₹{q.price} · ⏱ {q.timeline}</p>
                  <p className="text-sm text-gray-500 mt-1">{q.terms}</p>
                  {selected.status === 'open' && q.status === 'pending' && (
                    <button onClick={() => awardQuote(selected.id, q.vendorUid)} className="mt-2 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700">Award Contract</button>
                  )}
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
        <h1 className="text-2xl font-bold text-gray-900">🏭 Vendor Connector</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'browse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Browse</button>
          {isInstitution && <button onClick={() => setView('post')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'post' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>📋 Post Requirement</button>}
          {isInstitution && <button onClick={() => setView('mine')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'mine' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>My Requirements</button>}
        </div>
      </div>

      {view === 'browse' && (
        <div className="space-y-4">
          {requirements.length === 0 && (
            <div className="text-center py-16 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-3">🛒</p>
              <p>No open procurement requirements.</p>
            </div>
          )}
          {requirements.map(req => (
            <div key={req.id} onClick={() => setSelected(req)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{req.itemType}</span>
                  <h2 className="font-bold text-gray-900 mt-2">{req.description}</h2>
                  <p className="text-sm text-gray-500">{req.institutionName} · {req.location}</p>
                  <p className="text-sm text-gray-600 mt-1">Qty: {req.quantity} · Budget: ₹{req.budgetMin}–₹{req.budgetMax}</p>
                </div>
                <div className="text-right text-sm text-gray-400 whitespace-nowrap flex-shrink-0">
                  <p>Deadline: {req.deadline}</p>
                  <p className="text-blue-600 font-medium mt-1">{req.quotes?.length || 0} quotes</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'post' && isInstitution && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Post Procurement Requirement</h2>
          {msg && <div className={`rounded-lg p-3 text-sm mb-4 ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
          <form onSubmit={handlePost} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <select className="border border-gray-300 p-3 rounded-lg" value={form.itemType} onChange={e => setForm(f => ({...f, itemType: e.target.value}))}>
                {ITEM_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <input className="border border-gray-300 p-3 rounded-lg" placeholder="Quantity / Units" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />
            </div>
            <textarea className="w-full border border-gray-300 p-3 rounded-lg resize-none" rows={3} placeholder="Describe the items required in detail..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} required />
            <div className="grid grid-cols-2 gap-4">
              <input className="border border-gray-300 p-3 rounded-lg" placeholder="Budget Min (₹)" type="number" value={form.budgetMin} onChange={e => setForm(f => ({...f, budgetMin: e.target.value}))} />
              <input className="border border-gray-300 p-3 rounded-lg" placeholder="Budget Max (₹)" type="number" value={form.budgetMax} onChange={e => setForm(f => ({...f, budgetMax: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input className="border border-gray-300 p-3 rounded-lg" placeholder="Delivery Location" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Deadline</label>
                <input type="date" className="w-full border border-gray-300 p-3 rounded-lg" value={form.deadline} onChange={e => setForm(f => ({...f, deadline: e.target.value}))} required />
              </div>
            </div>
            <button type="submit" disabled={posting} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {posting ? 'Posting...' : 'Post Requirement'}
            </button>
          </form>
        </div>
      )}

      {view === 'mine' && isInstitution && (
        <div className="space-y-3">
          {myRequirements.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">No requirements posted yet.</div>}
          {myRequirements.map(req => (
            <div key={req.id} onClick={() => setSelected(req)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <p className="font-bold">{req.description?.slice(0,60)}</p>
                <p className="text-sm text-gray-500">{req.itemType} · Deadline: {req.deadline}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">{req.quotes?.length || 0} quotes</p>
                <span className={`text-xs px-2 py-1 rounded-full ${req.status === 'open' ? 'bg-green-100 text-green-700' : req.status === 'awarded' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{req.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
