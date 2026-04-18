import { db } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, arrayUnion
} from 'firebase/firestore';

// Create event
export const createEvent = async (uid, userData, event) => {
  return addDoc(collection(db, 'events'), {
    uid,
    organizerName: userData.name,
    title: event.title,
    description: event.description,
    category: event.category,
    location: event.location,
    dateTime: event.dateTime,
    capacity: Number(event.capacity),
    registeredCount: 0,
    attendees: [],
    status: 'upcoming', // upcoming | ongoing | completed | cancelled
    createdAt: serverTimestamp(),
  });
};

// Subscribe all upcoming events
export const subscribeEvents = (callback) => {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Register for event
export const registerForEvent = async (eventId, attendee) => {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  if (!snap.exists()) throw new Error('Event not found');
  const data = snap.data();
  if (data.registeredCount >= data.capacity) throw new Error('Event is full');
  const existing = (data.attendees || []).find(a => a.uid === attendee.uid);
  if (existing) throw new Error('Already registered');

  const ticketId = `TKT-${eventId.slice(0, 6).toUpperCase()}-${attendee.uid.slice(0, 4).toUpperCase()}`;
  await updateDoc(eventRef, {
    registeredCount: data.registeredCount + 1,
    attendees: arrayUnion({
      uid: attendee.uid,
      name: attendee.name,
      email: attendee.email,
      ticketId,
      attended: false,
      registeredAt: new Date().toISOString(),
    }),
  });
  return ticketId;
};

// Get my events (organized)
export const getMyEvents = async (uid) => {
  const q = query(collection(db, 'events'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get events I registered for
export const getMyRegistrations = async (uid) => {
  const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(e => (e.attendees || []).some(a => a.uid === uid));
};

// Mark attendance
export const markAttendance = async (eventId, attendeeUid) => {
  const eventRef = doc(db, 'events', eventId);
  const snap = await getDoc(eventRef);
  const attendees = (snap.data().attendees || []).map(a =>
    a.uid === attendeeUid ? { ...a, attended: true } : a
  );
  await updateDoc(eventRef, { attendees });
};
