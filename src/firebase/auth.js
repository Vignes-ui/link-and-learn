import { auth, db } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

const INSTITUTIONAL_ROLES = ['institution', 'govt_body', 'ngo', 'vendor', 'advertiser'];

export const signup = async (email, password, role = 'student', name = '') => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;
  const isInstitutional = INSTITUTIONAL_ROLES.includes(role);
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    name,
    avatar: '',
    role,
    loginType: isInstitutional ? 'institutional' : 'personal',
    accountStatus: isInstitutional ? 'pending' : 'active',
    profileCompleted: false,
    bio: '',
    skills: [],
    education: [],
    experience: [],
    publications: [],
    certificates: [],
    orgType: '',
    departments: [],
    catalogue: [],
    verifiedBadge: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return result;
};

export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.displayName || '',
      avatar: user.photoURL || '',
      role: 'student',
      loginType: 'personal',
      accountStatus: 'active',
      profileCompleted: false,
      bio: '',
      skills: [],
      education: [],
      experience: [],
      publications: [],
      certificates: [],
      orgType: '',
      departments: [],
      catalogue: [],
      verifiedBadge: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  return result;
};

export const logoutUser = () => signOut(auth);
