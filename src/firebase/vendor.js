import { db } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, arrayUnion
} from 'firebase/firestore';

// Post procurement requirement
export const postRequirement = async (uid, userData, requirement) => {
  return addDoc(collection(db, 'requirements'), {
    uid,
    institutionName: userData.name,
    itemType: requirement.itemType,
    description: requirement.description,
    quantity: requirement.quantity,
    budgetMin: requirement.budgetMin,
    budgetMax: requirement.budgetMax,
    deadline: requirement.deadline,
    location: requirement.location,
    status: 'open', // open | awarded | closed
    quotes: [],
    createdAt: serverTimestamp(),
  });
};

// Subscribe to all open requirements
export const subscribeRequirements = (callback) => {
  const q = query(collection(db, 'requirements'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Submit quote
export const submitQuote = async (requirementId, vendor) => {
  const reqRef = doc(db, 'requirements', requirementId);
  await updateDoc(reqRef, {
    quotes: arrayUnion({
      vendorUid: vendor.uid,
      vendorName: vendor.name,
      price: vendor.price,
      timeline: vendor.timeline,
      terms: vendor.terms,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }),
  });
};

// Get my requirements
export const getMyRequirements = async (uid) => {
  const q = query(collection(db, 'requirements'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get vendor catalogue
export const upsertVendorCatalogue = async (uid, catalogue) => {
  await updateDoc(doc(db, 'users', uid), {
    catalogue,
    updatedAt: serverTimestamp(),
  });
};

// Award quote
export const awardQuote = async (requirementId, vendorUid) => {
  const reqRef = doc(db, 'requirements', requirementId);
  const snap = await getDoc(reqRef);
  const quotes = (snap.data().quotes || []).map(q =>
    q.vendorUid === vendorUid ? { ...q, status: 'awarded' } : { ...q, status: 'rejected' }
  );
  await updateDoc(reqRef, { quotes, status: 'awarded' });
};
