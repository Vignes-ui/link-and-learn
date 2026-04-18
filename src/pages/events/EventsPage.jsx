import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { createEvent, subscribeEvents, registerForEvent, getMyEvents } from '../../api/events';

const EVENT_CATEGORIES = ['Conference', 'Workshop', 'Seminar', 'Webinar', 'Symposium', 'Networking', 'Hackathon', 'Other'];

function QRCode({ value, size = 160 }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    const ctx = canvasRef.current.getContext('2d');
    const cells = 21;
    const cell = size / cells;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';

    // Simple pattern based on value hash
    const hash = value.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0);
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isFinderPattern =
          (r < 7 && c < 7) || (r < 7 && c >= cells - 7) || (r >= cells - 7 && c < 7);
        if (isFinderPattern) {
          const inBorder = r === 0 || r === 6 || r === cells-7 || r === cells-1 || c === 0 || c === 6 || c === cells-7 || c === cells-1;
          const inInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= cells-5 && c <= cells-3) || (r >= cells-5 && r <= cells-3 && c >= 2 && c <= 4);
          if (inBorder || inInner) ctx.fillRect(c * cell, r * cell, cell, cell);
        } else {
          const bit = (hash >> ((r * cells + c) % 24)) & 1;
          if (bit) ctx.fillRect(c * cell, r * cell, cell, cell);
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
      setMsg('✅ Event created!');
      setForm({ title: '', description: '', category: EVENT_CATEGORIES[0], location: '', dateTime: '', capacity: 100 });
    } catch { setMsg('❌ Failed to create event'); }
    finally { setPosting(false); }
  };

  const handleRegister = async (eventId) => {
    setRegistering(true); setRegMsg(''); setTicket('');
    try {
      const ticketId = await registerForEvent(eventId, { uid: currentUser.uid, name: userData.name, email: userData.email });
      setTicket(ticketId);
      setRegMsg('✅ Registered! Your QR ticket is below.');
    } catch (e) { setRegMsg('❌ ' + e.message); }
    finally { setRegistering(false); }
  };

  if (selected) {
    const isFull = selected.registeredCount >= selected.capacity;

    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => { setSelected(null); setTicket(''); setRegMsg(''); }} className="text-blue-600 text-sm mb-4 hover:underline">← Back to events</button>
        <div className="bg-white rounded-2xl shadow p-8 space-y-4">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{selected.category}</span>
          <h1 className="text-2xl font-bold">{selected.title}</h1>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div><span className="text-gray-400">📅 Date</span><p className="font-medium mt-0.5">{new Date(selected.dateTime).toLocaleString()}</p></div>
            <div><span className="text-gray-400">📍 Location</span><p className="font-medium mt-0.5">{selected.location}</p></div>
            <div><span className="text-gray-400">👥 Capacity</span><p className="font-medium mt-0.5">{selected.registeredCount}/{selected.capacity} registered</p></div>
            <div><span className="text-gray-400">🏛 Organizer</span><p className="font-medium mt-0.5">{selected.organizerName}</p></div>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{selected.description}</p>

          {regMsg && <div className={`rounded-lg p-3 text-sm ${regMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{regMsg}</div>}

          {ticket && (
            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-6 text-center bg-blue-50">
              <p className="font-bold text-blue-800 text-lg mb-1">🎟 Your Ticket</p>
              <p className="text-sm text-blue-600 mb-4 font-mono">{ticket}</p>
              <QRCode value={ticket} size={160} />
              <p className="text-xs text-gray-500 mt-3">Show this QR code at the venue entrance</p>
            </div>
          )}

          {!ticket && (
            <button
              onClick={() => handleRegister(selected.id)}
              disabled={registering || isFull}
              className={`w-full py-3 rounded-xl font-semibold ${isFull ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
            >
              {isFull ? 'Event Full' : registering ? 'Registering...' : 'Register & Get Ticket'}
            </button>
          )}

          {selected.uid === currentUser.uid && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Attendees ({selected.attendees?.length || 0})</h3>
              {(selected.attendees || []).map((a, i) => (
                <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg p-3 mb-2">
                  <div>
                    <p className="font-medium text-sm">{a.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{a.ticketId}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${a.attended ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {a.attended ? '✅ Attended' : 'Registered'}
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
        <h1 className="text-2xl font-bold text-gray-900">🗓 Events</h1>
        <div className="flex gap-2">
          <button onClick={() => setView('browse')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'browse' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>Browse</button>
          {canCreate && <button onClick={() => setView('create')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'create' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>➕ Create</button>}
          {canCreate && <button onClick={() => setView('mine')} className={`px-4 py-2 rounded-lg text-sm font-medium ${view === 'mine' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>My Events</button>}
        </div>
      </div>

      {view === 'browse' && (
        <div className="grid md:grid-cols-2 gap-4">
          {events.length === 0 && (
            <div className="col-span-2 text-center py-16 text-gray-400 bg-white rounded-2xl">
              <p className="text-4xl mb-3">🗓</p>
              <p>No events scheduled yet.</p>
            </div>
          )}
          {events.map(evt => (
            <div key={evt.id} onClick={() => setSelected(evt)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow">
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{evt.category}</span>
              <h2 className="font-bold text-gray-900 mt-2">{evt.title}</h2>
              <p className="text-sm text-gray-500 mt-1">{evt.organizerName}</p>
              <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                <span>📅 {new Date(evt.dateTime).toLocaleDateString()}</span>
                <span>👥 {evt.registeredCount}/{evt.capacity}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">📍 {evt.location}</p>
            </div>
          ))}
        </div>
      )}

      {view === 'create' && canCreate && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-bold mb-4">Create New Event</h2>
          {msg && <div className={`rounded-lg p-3 text-sm mb-4 ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Event Title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
            <div className="grid grid-cols-2 gap-4">
              <select className="border border-gray-300 p-3 rounded-lg" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                {EVENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input type="number" className="border border-gray-300 p-3 rounded-lg" placeholder="Capacity" value={form.capacity} onChange={e => setForm(f => ({...f, capacity: e.target.value}))} min={1} />
            </div>
            <input className="w-full border border-gray-300 p-3 rounded-lg" placeholder="Location / Venue" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} required />
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Date & Time</label>
              <input type="datetime-local" className="w-full border border-gray-300 p-3 rounded-lg" value={form.dateTime} onChange={e => setForm(f => ({...f, dateTime: e.target.value}))} required />
            </div>
            <textarea className="w-full border border-gray-300 p-3 rounded-lg resize-none" rows={4} placeholder="Event Description" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
            <button type="submit" disabled={posting} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {posting ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </div>
      )}

      {view === 'mine' && canCreate && (
        <div className="space-y-3">
          {myEvents.length === 0 && <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">No events created yet.</div>}
          {myEvents.map(evt => (
            <div key={evt.id} onClick={() => setSelected(evt)} className="bg-white rounded-2xl shadow p-5 cursor-pointer hover:shadow-md transition-shadow flex items-center justify-between">
              <div>
                <p className="font-bold">{evt.title}</p>
                <p className="text-sm text-gray-500">{evt.category} · {new Date(evt.dateTime).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-blue-600">{evt.registeredCount}/{evt.capacity} registered</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{evt.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
