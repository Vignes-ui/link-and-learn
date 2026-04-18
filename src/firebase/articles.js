import { db } from './config';
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc,
  query, orderBy, where, serverTimestamp, onSnapshot, getDoc
} from 'firebase/firestore';

// Publish article (saved as pending AI review)
export const publishArticle = async (uid, userData, article) => {
  return addDoc(collection(db, 'articles'), {
    uid,
    authorName: userData.name,
    authorRole: userData.role,
    title: article.title,
    content: article.content,
    category: article.category,
    tags: article.tags,
    status: 'pending', // pending | published | flagged | rejected
    aiScore: null,
    aiCategory: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// Subscribe all published articles
export const subscribeArticles = (callback) => {
  const q = query(
    collection(db, 'articles'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
};

// Get articles by author
export const getMyArticles = async (uid) => {
  const q = query(collection(db, 'articles'), where('uid', '==', uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Update article status (admin)
export const updateArticleStatus = async (articleId, status, reason = '') => {
  await updateDoc(doc(db, 'articles', articleId), {
    status,
    adminNote: reason,
    updatedAt: serverTimestamp(),
  });
};

// Delete article
export const deleteArticle = async (articleId) => {
  await deleteDoc(doc(db, 'articles', articleId));
};

// Get single article
export const getArticle = async (articleId) => {
  const snap = await getDoc(doc(db, 'articles', articleId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};
