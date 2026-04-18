import { db } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, setDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, getDoc
} from 'firebase/firestore';

// Get or create conversation between two users
export const getConversationId = (uid1, uid2) => {
  return [uid1, uid2].sort().join('_');
};

// Send message
export const sendMessage = async (senderId, receiverId, text) => {
  const convId = getConversationId(senderId, receiverId);
  const convRef = doc(db, 'conversations', convId);
  const convSnap = await getDoc(convRef);

  if (!convSnap.exists()) {
    await setDoc(convRef, {
      participants: [senderId, receiverId],
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(convRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });
  }

  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    senderId,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });
};

// Subscribe to messages in a conversation
export const subscribeMessages = (senderId, receiverId, callback) => {
  const convId = getConversationId(senderId, receiverId);
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Get my conversations list
export const subscribeConversations = (uid, callback) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Search users to start a conversation
export const searchUsers = async (searchTerm) => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u =>
      u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
};
