import { db, storage } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, limit, onSnapshot, arrayUnion, arrayRemove,
  serverTimestamp, getDoc, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Create a post
export const createPost = async (uid, userData, content, imageFile = null) => {
  let imageUrl = '';
  if (imageFile) {
    const imgRef = ref(storage, `posts/${uid}/${Date.now()}_${imageFile.name}`);
    const snap = await uploadBytes(imgRef, imageFile);
    imageUrl = await getDownloadURL(snap.ref);
  }
  return addDoc(collection(db, 'posts'), {
    uid,
    authorName: userData.name,
    authorRole: userData.role,
    authorAvatar: userData.avatar || '',
    content,
    imageUrl,
    likes: [],
    comments: [],
    createdAt: serverTimestamp(),
  });
};

// Subscribe to feed (real-time)
export const subscribeFeed = (callback) => {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(posts);
  });
};

// Toggle like
export const toggleLike = async (postId, uid) => {
  const ref_ = doc(db, 'posts', postId);
  const snap = await getDoc(ref_);
  const likes = snap.data().likes || [];
  if (likes.includes(uid)) {
    await updateDoc(ref_, { likes: arrayRemove(uid) });
  } else {
    await updateDoc(ref_, { likes: arrayUnion(uid) });
  }
};

// Add comment
export const addComment = async (postId, uid, authorName, text) => {
  const commentRef = doc(db, 'posts', postId);
  const comment = { uid, authorName, text, createdAt: new Date().toISOString() };
  await updateDoc(commentRef, { comments: arrayUnion(comment) });
};

// Delete post
export const deletePost = async (postId) => {
  await deleteDoc(doc(db, 'posts', postId));
};
