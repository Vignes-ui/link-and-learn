import { useEffect, useState } from 'react';
import { Megaphone, Send, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { createAd, getMyAds } from '../../api/ads';

const AUDIENCE_OPTIONS = ['Students', 'Researchers', 'Institutions', 'Vendors', 'Funding Agencies'];
const PLACEMENTS = ['feed', 'banner', 'newsletter'];

export default function AdsPage() {
  const [view, setView] = useState('create');
  const [ads, setAds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    placement: 'feed',
    budget: '',
    destinationUrl: '',
    targetAudience: ['Students'],
  });

  useEffect(() => {
    if (view === 'mine') {
      getMyAds().then(setAds);
    }
  }, [view]);

  const toggleAudience = (value) => {
    setForm((current) => ({
      ...current,
      targetAudience: current.targetAudience.includes(value)
        ? current.targetAudience.filter((item) => item !== value)
        : [...current.targetAudience, value],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await createAd(form);
      setForm({
        title: '',
        description: '',
        placement: 'feed',
        budget: '',
        destinationUrl: '',
        targetAudience: ['Students'],
      });
      setMessage('Campaign submitted for admin review.');
    } catch (error) {
      setMessage(error.message || 'Failed to submit campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 lg:space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-amber-900 to-orange-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Advertising Studio <Megaphone className="w-8 h-8 text-amber-300" />
          </h1>
          <p className="text-amber-100 font-medium">Launch sponsored placements and monitor campaign performance.</p>
        </div>

        <div className="flex flex-wrap gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
          <button
            onClick={() => setView('create')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'create' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            New Campaign
          </button>
          <button
            onClick={() => setView('mine')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'mine' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            My Campaigns
          </button>
        </div>
      </div>

      {view === 'create' && (
        <div className="glass-panel rounded-[2rem] shadow-lg p-8 sm:p-10 border border-white/60 animate-slide-up">
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Create Sponsored Campaign</h2>

          {message && (
            <div className={`rounded-xl p-4 text-sm font-medium border mb-8 flex items-center gap-3 shadow-sm ${message.includes('submitted') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {message.includes('submitted') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Campaign Title</label>
              <input
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="e.g. National Research Fellowship 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Creative Copy</label>
              <textarea
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all resize-none"
                rows={5}
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Describe the offer, program, event, or opportunity you want to promote."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Placement</label>
                <select
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                  value={form.placement}
                  onChange={(e) => setForm((current) => ({ ...current, placement: e.target.value }))}
                >
                  {PLACEMENTS.map((placement) => <option key={placement} value={placement}>{placement}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Budget</label>
                <input
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                  value={form.budget}
                  onChange={(e) => setForm((current) => ({ ...current, budget: e.target.value }))}
                  placeholder="e.g. 25000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Destination URL</label>
                <input
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-sm transition-all"
                  value={form.destinationUrl}
                  onChange={(e) => setForm((current) => ({ ...current, destinationUrl: e.target.value }))}
                  placeholder="https://example.org"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Target Audience</label>
              <div className="flex flex-wrap gap-3">
                {AUDIENCE_OPTIONS.map((option) => {
                  const active = form.targetAudience.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleAudience(option)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${active ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-primary-600 text-white px-10 py-4 rounded-xl font-bold shadow-md hover:shadow-lg hover:bg-primary-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2"
            >
              {submitting ? 'Submitting...' : <>Submit Campaign <Send className="w-5 h-5" /></>}
            </button>
          </form>
        </div>
      )}

      {view === 'mine' && (
        <div className="space-y-4 animate-slide-up">
          {ads.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-[2rem] border border-white/60">
              <BarChart3 className="w-10 h-10 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-700">No campaigns yet.</p>
            </div>
          ) : (
            ads.map((ad) => (
              <div key={ad.id} className="glass-panel rounded-2xl p-6 border border-white/60 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">{ad.placement}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${ad.status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : ad.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{ad.status}</span>
                  </div>
                  <h3 className="font-bold text-xl text-slate-900">{ad.title}</h3>
                  <p className="text-slate-600 mt-1">{ad.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 md:w-64">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Impressions</p>
                    <p className="text-lg font-bold text-slate-800">{ad.impressions}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Clicks</p>
                    <p className="text-lg font-bold text-slate-800">{ad.clicks}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
