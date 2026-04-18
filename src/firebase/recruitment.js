import { db } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, getDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, arrayUnion
} from 'firebase/firestore';

const INSTITUTIONAL_ROLES = ['institution', 'govt_body', 'ngo', 'admin'];

export const createVacancy = async (uid, userData, vacancy) => {
  return addDoc(collection(db, 'vacancies'), {
    uid,
    institutionName: userData.name,
    role: vacancy.role,
    roleType: vacancy.roleType,
    department: vacancy.department,
    eligibility: vacancy.eligibility,
    description: vacancy.description,
    deadline: vacancy.deadline,
    status: 'open',
    applicants: [],
    createdAt: serverTimestamp(),
  });
};

export const subscribeVacancies = (callback) => {
  const q = query(collection(db, 'vacancies'), where('status', '==', 'open'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

export const applyForVacancy = async (vacancyId, applicant) => {
  await updateDoc(doc(db, 'vacancies', vacancyId), {
    applicants: arrayUnion({
      uid: applicant.uid,
      name: applicant.name,
      email: applicant.email,
      role: applicant.role,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    }),
  });
};

export const getMyVacancies = async (uid) => {
  const q = query(collection(db, 'vacancies'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateApplicantStatus = async (vacancyId, applicantUid, newStatus) => {
  const docRef = doc(db, 'vacancies', vacancyId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const applicants = (snap.data().applicants || []).map(a =>
    a.uid === applicantUid ? { ...a, status: newStatus } : a
  );
  await updateDoc(docRef, { applicants });
};
