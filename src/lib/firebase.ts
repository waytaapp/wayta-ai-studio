import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  signOut,
  initializeAuth,
  browserSessionPersistence,
  browserLocalPersistence,
  setPersistence,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { getDatabase, ref, set, update, get, remove, push, onValue, query as rtdbQuery, orderByChild, equalTo, serverTimestamp as rtdbTimestamp, runTransaction } from 'firebase/database';
import { getFirestore, doc, getDoc, getDocFromServer, collection, onSnapshot, query, where, getDocs, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, runTransaction as fsRunTransaction, collectionGroup, writeBatch, orderBy } from 'firebase/firestore';
import { getMessaging, onMessage, getToken } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../../firebase-applet-config.json';

// Use existing app if available to prevent re-initialization errors
const config = {
  ...firebaseConfig,
  databaseURL: (firebaseConfig as any).databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com/`
};

const app = getApps().length > 0 ? getApp() : initializeApp(config);

// Initialize Auth with explicit persistence for cross-domain stability
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, browserSessionPersistence],
});
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Failed to set Auth persistence:", err);
});

// Initialize Realtime Database
export const rtdb = getDatabase(app);
export const database = getDatabase(app);
export { ref, set, update, get, remove, push, onValue, rtdbQuery, orderByChild, equalTo, rtdbTimestamp, runTransaction };

// Initialize Firestore with specific database ID if present
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export { doc, getDoc, collection, onSnapshot, query, where, getDocs, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, fsRunTransaction, collectionGroup, writeBatch, orderBy };

// Initialize Functions
export const functions = getFunctions(app);

export const messaging = (() => {
  try {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      return getMessaging(app);
    }
  } catch (e) {
    console.warn('Firebase Messaging not supported or blocked:', e);
  }
  return null;
})();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleRTDBError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
    databaseType: 'REALTIME_DATABASE'
  };
  console.error('Realtime Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
    databaseType: 'FIRESTORE'
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // We don't necessarily want to crash the whole app by throwing, 
  // but for debugging it's useful. Let's log it prominently.
  return errInfo;
}

// Connection test for RTDB
async function testConnection() {
  try {
    const connectedRef = ref(rtdb, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log("✅ Realtime Database connected");
      } else {
        console.warn("⚠️ Realtime Database disconnected");
      }
    }, (error) => {
      console.warn("Realtime Database self-test connection listener error (silently caught):", error);
    });

    // Test Firestore
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("✅ Firestore connected");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    console.warn("Firebase connection test skipped or failed (silently caught):", error);
  }
}
testConnection();

export const signIn = async () => {
  try {
    if ((auth as any).authStateReady) {
      await (auth as any).authStateReady();
    }
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error: any) {
    console.warn("Google Sign In failed, falling back to anonymous:", error);
    return await signInAnonymously(auth);
  }
};
export const logout = () => signOut(auth);
