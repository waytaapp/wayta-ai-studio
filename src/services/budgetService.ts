import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';

export interface Budget {
  monthly_limit: number;
  currency: string;
  userId: string;
}

/**
 * Returns a real-time snapshot stream of the budgets/{userId} document.
 * Returns an unsubscribe function.
 */
export function getBudgetStream(userId: string, callback: (budget: Budget | null) => void) {
  const budgetRef = doc(db, 'budgets', userId);
  return onSnapshot(budgetRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ userId, ...snapshot.data() } as Budget);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error streaming budget document:', error);
  });
}

/**
 * Updates monthly_limit in budgets/{userId}.
 */
export async function increaseBudget(userId: string, newLimit: number): Promise<void> {
  const budgetRef = doc(db, 'budgets', userId);
  await updateDoc(budgetRef, {
    monthly_limit: newLimit
  });
}

/**
 * Creates the budget document if it doesn't exist.
 */
export async function initBudget(userId: string, limit: number, currency: string): Promise<void> {
  const budgetRef = doc(db, 'budgets', userId);
  await setDoc(budgetRef, {
    monthly_limit: limit,
    currency: currency
  }, { merge: true });
}
