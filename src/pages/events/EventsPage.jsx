import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createEvent, subscribeEvents, registerForEvent, getMyEvents } from '../../api/events';
import { CalendarDays, Ticket, Users, CheckCircle2, Clock, PlusCircle, Mic, AlertTriangle, PartyPopper, Ban, QrCode, Info } from 'lucide-react';

const EVENT_CATEGORIES = ['Conference', 'Workshop', 'Seminar', 'Webinar', 'Symposium', 'Networking', 'Hackathon', 'Other'];

function QRCode({ value, size = 160 }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const ctx = canvasRef.current.getContext('2d');
    const cells = 21;
    const cell = size / cells;
    
    // Smooth edges and rounded QR for premium feel
    ctx.clearRect(0, 0, size, size);
    
    // Background with slight transparency
    ctx.fillStyle = 'rgba(255, 255, 255, 0)';
    ctx.fillRect(0, 0, size, size);

    // Simple pattern based on value hash
    const hash = value.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0);
    
    // We will draw rounded rects
    const drawRoundedRect = (x, y, w, h, r, fill) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    const qrColor = '#1e293b'; // slate-800
    
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isFinderPattern =
          (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
        if (isFinderPattern) {
          const inBorder = r === 0 || r === 6 || r === cells-7 || r === cells-1 || c === 0 || c === 6 || c === cells-7 || c === cells-1;
          const inInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= cells-5 && c <= cells-3) || (r >= cells-5 && r <= cells-3 && c >= 2 && c <= 4);
          
          if (inBorder || inInner) {
             drawRoundedRect(c * cell, r * cell, cell + 0.5, cell + 0.5, 0, qrColor); // Use 0 radius to keep finders solid
          }
        } else {
          const bit = (hash >> ((r * cells + c) % 24)) & 1;
          if (bit) {
             // Draw individual dots with a slight border radius
             drawRoundedRect(c * cell + 0.5, r * cell + 0.5, cell - 1, cell - 1, cell * 0.4, qrColor);
          }
        }
      }
    }
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="mx-auto" />;
}

export default function EventsPage() {
  const { currentUser, userData } = useAuth();
  const [events, setEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [view, setView] = useState('browse');
  const [selected, setSelected] = useState(null);
  const [ticket, setTicket] = useState('');
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState('');

  const [form, setForm] = useState({ title: '', description: '', category: EVENT_CATEGORIES[0], location: '', dateTime: '', capacity: 100 });
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState('');

  const canCreate = ['institution', 'govt_body', 'ngo', 'researcher', 'admin'].includes(userData?.role);

  useEffect(() => {
    const unsub = subscribeEvents(setEvents);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (view === 'mine' && canCreate) {
      getMyEvents().then(setMyEvents);
    }
  }, [view, canCreate]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setPosting(true); setMsg('');
    try {
      await createEvent(currentUser.uid, userData, form);
      setMsg('✅ Event created successfully!');
      setForm({ title: '', description: '', category: EVENT_CATEGORIES[0], location: '', dateTime: '', capacity: 100 });
      setTimeout(() => setMsg(''), 5000);
    } catch { setMsg('❌ Failed to create event'); }
    finally { setPosting(false); }
  };

  const handleRegister = async (eventId) => {
    setRegistering(true); setRegMsg(''); setTicket('');
    try {
      const ticketId = await registerForEvent(eventId, { uid: currentUser.uid, name: userData.name, email: userData.email });
      setTicket(ticketId);
      setRegMsg('✅ Successfully registered! Your QR ticket is below.');
    } catch (e) { setRegMsg('❌ ' + e.message); }
    finally { setRegistering(false); }
  };

  if (selected) {
    const isFull = selected.registeredCount >= selected.capacity;

    return (
      <div className="max-w-4xl mx-auto animate-fade-in pb-12">
        <button onClick={() => { setSelected(null); setTicket(''); setRegMsg(''); }} className="group flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold mb-6 transition-colors">
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Back to Events
        </button>
        
        <div className="glass-panel rounded-[2rem] shadow-sm border border-white/60 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-60 -z-10 -translate-x-1/3 -translate-y-1/3" />
          
          {/* Header section */}
          <div className="p-8 sm:p-10 border-b border-slate-100 bg-white/40">
            <span className="inline-block text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm mb-4">{selected.category}</span>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 mb-6 leading-tight">{selected.title}</h1>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 bg-white/60 rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div>
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  Date & Time
                </span>
                <p className="font-semibold text-slate-800 text-sm">
                  {new Date(selected.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <div>
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                  Location
                </span>
                <p className="font-semibold text-slate-800 text-sm line-clamp-2">{selected.location}</p>
              </div>
              <div>
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                  Capacity
                </span>
                <p className="font-semibold text-slate-800 text-sm">
                  {selected.registeredCount} / {selected.capacity}
                  <span className="text-slate-400 font-normal ml-1 text-xs">Registered</span>
                </p>
              </div>
              <div>
                <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  Organizer
                </span>
                <p className="font-semibold text-slate-800 text-sm truncate">{selected.organizerName}</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 sm:p-10 space-y-8 bg-white/20">
            <div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary-500" /> About this Event
              </h3>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
            </div>

            {regMsg && (
              <div className={`rounded-xl p-4 text-sm font-medium border flex items-center gap-3 animate-fade-in shadow-sm ${regMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {regMsg.startsWith('✅') ? <PartyPopper className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                {regMsg.replace('✅ ', '').replace('❌ ', '')}
              </div>
            )}

            {ticket && (
              <div className="relative group overflow-hidden border-2 border-dashed border-primary-300 rounded-3xl p-8 sm:p-10 text-center bg-gradient-to-b from-primary-50 to-white shadow-inner animate-slide-up">
                <div className="absolute inset-0 bg-primary-100 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                <p className="font-display font-bold text-primary-800 text-2xl mb-2 flex items-center justify-center gap-3">
                  <Ticket className="w-6 h-6" /> Your Digital Pass
                </p>
                <p className="text-sm font-bold text-slate-500 mb-8 tracking-widest uppercase font-mono bg-white inline-block px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">{ticket}</p>
                
                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 inline-block mx-auto transform transition-transform group-hover:scale-105 duration-500">
                  <QRCode value={ticket} size={200} />
                </div>
                
                <div className="mt-8 flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  Scan at the venue entrance
                </div>
              </div>
            )}

            {!ticket && (
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={() => handleRegister(selected.id)}
                  disabled={registering || isFull}
                  className={`w-full sm:w-auto px-10 py-4 rounded-xl font-bold shadow-md transition-all flex items-center justify-center gap-3 ${isFull ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-primary-600 text-white hover:bg-primary-700 hover:shadow-lg disabled:opacity-50'}`}
                >
                  {isFull ? (
                    <><Ban className="w-5 h-5" /> Event at Capacity</>
                  ) : registering ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Reserving Spot...</>
                  ) : (
                    <>Reserve Spot & Get Ticket <Ticket className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            )}

            {selected.uid === currentUser.uid && (
              <div className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-display font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-500" /> Attendee List
                    <span className="bg-slate-200 text-slate-700 text-xs py-1 px-2.5 rounded-full ml-2">{selected.attendees?.length || 0}</span>
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {(selected.attendees || []).length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
                      <p className="text-slate-500 font-medium">No registrations yet.</p>
                    </div>
                  ) : (
                    (selected.attendees || []).map((a, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow gap-4">
                        <div className="flex items-center gap-4">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(a.name)}&background=e2e8f0&color=475569&size=40`} className="w-10 h-10 rounded-full" alt="" />
                          <div>
                            <p className="font-bold text-slate-900">{a.name}</p>
                            <p className="text-xs font-mono font-medium text-slate-500 mt-0.5 bg-slate-100 px-2 py-0.5 rounded inline-block">{a.ticketId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 ${a.attended ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {a.attended ? <><CheckCircle2 className="w-3.5 h-3.5" /> Checked In</> : <><Clock className="w-3.5 h-3.5" /> Registered</>}
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 to-slate-900 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 translate-y-1/2 -translate-x-1/2" />
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight mb-2 flex items-center gap-3">
            Events Hub <CalendarDays className="w-8 h-8 text-indigo-300" />
          </h1>
          <p className="text-slate-300 font-medium">Discover conferences, workshops, and networking sessions.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 relative z-10 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
          <button 
            onClick={() => setView('browse')} 
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'browse' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
          >
            Browse Events
          </button>
          {canCreate && (
            <button 
              onClick={() => setView('create')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'create' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              Host Event
            </button>
          )}
          {canCreate && (
            <button 
              onClick={() => setView('mine')} 
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'mine' ? 'bg-white text-slate-900 shadow-md' : 'text-white hover:bg-white/20'}`}
            >
              My Hosted Events
            </button>
          )}
        </div>
      </div>

      {view === 'browse' && (
        <div className="space-y-6 animate-slide-up">
          {events.length === 0 && (
            <div className="text-center py-24 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 border border-slate-200 shadow-inner">
                <CalendarDays className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-900 mb-2">No upcoming events</h3>
              <p className="text-slate-500 font-medium">Check back later or host your own!</p>
            </div>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((evt, idx) => (
              <div 
                key={evt.id} 
                onClick={() => setSelected(evt)} 
                className="glass-panel rounded-[2rem] p-6 cursor-pointer hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 border border-white/60 group relative overflow-hidden flex flex-col"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100 rounded-full blur-[40px] opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10" />
                
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 shadow-sm">{evt.category}</span>
                  <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-center shadow-sm group-hover:bg-indigo-50 group-hover:border-indigo-200 transition-colors">
                    <div className="flex flex-col leading-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(evt.dateTime).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-sm font-bold text-slate-800">{new Date(evt.dateTime).getDate()}</span>
                    </div>
                  </div>
                </div>
                
                <h2 className="text-xl font-display font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors leading-tight line-clamp-2">{evt.title}</h2>
                <p className="text-sm font-semibold text-slate-500 mb-6 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  <span className="truncate">{evt.organizerName}</span>
                </p>
                
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    {new Date(evt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    <span className="truncate">{evt.location}</span>
                  </div>
                </div>
                
                {/* Progress bar for capacity */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    <span>Registered</span>
                    <span>{evt.registeredCount}/{evt.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${evt.registeredCount >= evt.capacity ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (evt.registeredCount / evt.capacity) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'create' && canCreate && (
        <div className="max-w-3xl mx-auto glass-panel rounded-[2rem] shadow-lg p-8 sm:p-10 border border-white/60 animate-slide-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-40 -z-10" />
          
          <h2 className="text-2xl font-display font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center border border-indigo-200 shadow-sm"><PlusCircle className="w-5 h-5" /></span>
            Host a New Event
          </h2>
          
          {msg && (
            <div className={`rounded-xl p-4 text-sm font-medium border mb-8 flex items-center gap-3 shadow-sm ${msg.startsWith('✅') ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
              {msg.startsWith('✅') ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {msg.replace('✅ ', '').replace('❌ ', '')}
            </div>
          )}
          
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Event Title</label>
              <input 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                placeholder="e.g. Annual AI & Education Summit" 
                value={form.title} 
                onChange={e => setForm(f => ({...f, title: e.target.value}))} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Event Category</label>
                <div className="relative">
                  <select 
                    className="w-full appearance-none bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all cursor-pointer" 
                    value={form.category} 
                    onChange={e => setForm(f => ({...f, category: e.target.value}))}
                  >
                    {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">▼</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Max Capacity</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                  placeholder="e.g. 100" 
                  value={form.capacity} 
                  onChange={e => setForm(f => ({...f, capacity: e.target.value}))} 
                  min={1} 
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Location / Venue</label>
                <input 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all" 
                  placeholder="e.g. Main Auditorium or Zoom Link" 
                  value={form.location} 
                  onChange={e => setForm(f => ({...f, location: e.target.value}))} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-slate-700" 
                  value={form.dateTime} 
                  onChange={e => setForm(f => ({...f, dateTime: e.target.value}))} 
                  required 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Event Description</label>
              <textarea 
                className="w-full bg-white border border-slate-200 p-3.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all resize-none" 
                rows={5} 
                placeholder="What is this event about? Who should attend?" 
                value={form.description} 
                onChange={e => setForm(f => ({...f, description: e.target.value}))} 
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
                  <>Create Event <PartyPopper className="w-5 h-5" /></>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'mine' && canCreate && (
        <div className="space-y-4 animate-slide-up">
          {myEvents.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-[2rem] border border-white/60">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-slate-200">
                <Mic className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg font-bold text-slate-700">No events created yet.</p>
              <button onClick={() => setView('create')} className="mt-4 text-primary-600 font-semibold hover:underline">Host your first event →</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myEvents.map((evt, idx) => (
                <div 
                  key={evt.id} 
                  onClick={() => setSelected(evt)} 
                  className="glass-panel rounded-2xl p-5 sm:p-6 cursor-pointer hover:shadow-md transition-all border border-white/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform flex-shrink-0">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary-600 transition-colors">{evt.title}</h3>
                      <p className="text-sm font-medium text-slate-500 mt-1">{evt.category} <span className="mx-2 opacity-50">•</span> {new Date(evt.dateTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-3 pl-16 sm:pl-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                      <span className="text-sm font-bold text-indigo-700">{evt.registeredCount}/{evt.capacity}</span>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Registered</span>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-sm ${evt.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {evt.status}
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
