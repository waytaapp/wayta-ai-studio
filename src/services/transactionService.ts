import { db, rtdb, handleRTDBError, OperationType, ref, get, set, push, onValue, rtdbQuery, orderByChild, equalTo, rtdbTimestamp } from '../lib/firebase';
import { collection, query as fsQuery, where as fsWhere, orderBy as fsOrderBy, limit as fsLimit, onSnapshot } from 'firebase/firestore';
import { Transaction } from '../types';

export const transactionService = {
  async createTransaction(userId: string, tx: Omit<Transaction, 'id'>) {
    const path = `transactions`;
    try {
      const txRef = ref(rtdb, path);
      const newTxRef = push(txRef);
      const rawData = {
        ...tx,
        user_id: userId,
        createdAt: rtdbTimestamp()
      };
      // Robust scrub for RTDB (remove undefined values)
      const txData = JSON.parse(JSON.stringify(rawData, (_, v) => v === undefined ? null : v));
      await set(newTxRef, txData);
      return newTxRef.key;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  },

  async createFirestoreTransaction(userId: string, tx: Omit<Transaction, 'id'>) {
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...tx,
        user_id: userId,
        createdAt: serverTimestamp(),
        processed_at: null,
      });
      return docRef.id;
    } catch (err) {
      console.error('Error creating Firestore transaction:', err);
      throw err;
    }
  },

  listenToUserTransactions(userId: string, callback: (txs: Transaction[]) => void) {
    if (!userId) {
      console.warn('transactionService.listenToUserTransactions called without userId');
      return () => {};
    }
    const path = `transactions`;
    let unsubscribeFirestore: (() => void) | null = null;
    let isRTDBActive = true;

    const txRef = ref(rtdb, path);
    const userTxQuery = rtdbQuery(txRef, orderByChild('user_id'), equalTo(userId));

    let unsubscribeRTDB = () => {};

    try {
      unsubscribeRTDB = onValue(userTxQuery, (snapshot) => {
        if (!isRTDBActive) return;
        try {
          const txs: Transaction[] = [];
          snapshot.forEach((child) => {
            txs.push({ ...child.val(), id: child.key! } as Transaction);
          });
          // Sort manually descending by createdAt
          callback(txs.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)));
        } catch (e) {
          console.warn('Error reading RTDB transactions snapshot:', e);
        }
      }, (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const isPermissionDenied = errorMsg.toLowerCase().includes('permission_denied') || 
                                   errorMsg.toLowerCase().includes('permission denied') || 
                                   (error as any).code === 'PERMISSION_DENIED';

        if (isPermissionDenied) {
          console.warn('RTDB /transactions listener failed with permission_denied silently, falling back to Firestore collection "wallet_transactions" (ordered by createdAt desc, limit 50):', error);
          isRTDBActive = false;
          unsubscribeRTDB();

          try {
            const walletTxCol = collection(db, 'wallet_transactions');
            const q = fsQuery(
              walletTxCol,
              fsWhere('userId', '==', userId),
              fsOrderBy('createdAt', 'desc'),
              fsLimit(50)
            );

            unsubscribeFirestore = onSnapshot(q, (snapshot) => {
              try {
                const txs: Transaction[] = [];
                snapshot.forEach((doc) => {
                  const data = doc.data();
                  let createdAtVal = 0;
                  if (data.createdAt) {
                    if (typeof data.createdAt.toMillis === 'function') {
                      createdAtVal = data.createdAt.toMillis();
                    } else if (data.createdAt.seconds) {
                      createdAtVal = data.createdAt.seconds * 1000;
                    } else {
                      createdAtVal = Number(data.createdAt) || 0;
                    }
                  }
                  txs.push({
                    ...data,
                    id: doc.id,
                    user_id: data.userId || userId,
                    createdAt: createdAtVal
                  } as unknown as Transaction);
                });
                callback(txs);
              } catch (e) {
                console.warn('Error parsing Firestore fallback wallet_transactions:', e);
              }
            }, (fsError) => {
              console.warn('Firestore fallback wallet_transactions listener error:', fsError);
            });
          } catch (fsErr) {
            console.error('Error setting up Firestore fallback listener:', fsErr);
          }
        } else {
          try {
            handleRTDBError(error, OperationType.LIST, path);
          } catch (e) {
            console.error('Re-throwing non-permission-denied RTDB error:', e);
            throw e;
          }
        }
      });
    } catch (err) {
      console.warn('Failed to subscribe to RTDB /transactions:', err);
    }

    return () => {
      isRTDBActive = false;
      unsubscribeRTDB();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }
};
