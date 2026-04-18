import { db, storage } from './config';
import {
  doc, updateDoc, getDoc, getDocs, collection,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Update full profile
export const updateProfile = async (uid, profileData) => {
  await updateDoc(doc(db, 'users', uid), {
    ...profileData,
    updatedAt: serverTimestamp(),
  });
};

// Upload avatar
export const uploadAvatar = async (uid, file) => {
  const imgRef = ref(storage, `avatars/${uid}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(imgRef, file);
  const url = await getDownloadURL(snap.ref);
  await updateDoc(doc(db, 'users', uid), { avatar: url, updatedAt: serverTimestamp() });
  return url;
};

// Upload degree certificate
export const uploadCertificate = async (uid, file, degree) => {
  const certRef = ref(storage, `certificates/${uid}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(certRef, file);
  const url = await getDownloadURL(snap.ref);

  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const existing = userSnap.data()?.certificates || [];

  await updateDoc(userRef, {
    certificates: [
      ...existing,
      {
        degree,
        fileUrl: url,
        fileName: file.name,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
      },
    ],
    updatedAt: serverTimestamp(),
  });

  return url;
};

// Get user by uid
export const getUserById = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

// Get all users (admin + messaging search)
export const getAllUsers = async () => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get pending institutions
export const getPendingInstitutions = async () => {
  const q = query(collection(db, 'users'), where('accountStatus', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Approve / reject institution
export const updateAccountStatus = async (uid, status) => {
  await updateDoc(doc(db, 'users', uid), {
    accountStatus: status,
    updatedAt: serverTimestamp(),
  });
};

// Update certificate status (admin)
export const updateCertificateStatus = async (uid, certIndex, status) => {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const certs = snap.data()?.certificates || [];
  certs[certIndex] = { ...certs[certIndex], status };
  await updateDoc(userRef, { certificates: certs, updatedAt: serverTimestamp() });
};
