import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wayta-rbac-v10';
const databaseId =
  import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-2ea8ff24-bbdd-46a8-a8a7-b0e54e4ae964';

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;

export const isFirebaseConfigured = Boolean(apiKey);

const firebaseConfig: FirebaseOptions = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// This project's Firestore lives in a named (non-default) database, so every
// caller must go through this `db` export rather than calling getFirestore()
// directly — passing no database id silently targets `(default)`.
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app, databaseId) : null;
