import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAfJguNgyGPUSzBZJWerPB8wF4AeJ0n-Yc",
  authDomain: "link-and-learn.firebaseapp.com",
  projectId: "link-and-learn",
  storageBucket: "link-and-learn.firebasestorage.app",
  messagingSenderId: "495296489471",
  appId: "1:495296489471:web:82bed131ba48911a9869ca"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;