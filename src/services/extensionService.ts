import { rtdb, handleRTDBError, OperationType, ref, push, set, rtdbTimestamp } from '../lib/firebase';

/**
 * Service to interact with Firebase Extensions
 * 1. Trigger Email (Email Extension - can be configured for RTDB)
 * 2. Search Indexing
 * 3. Payment Processing
 */
export const extensionService = {
  /**
   * Triggers an email via the "Send Email" extension logic
   */
  async sendEmail(to: string, subject: string, text: string, html?: string) {
    const path = 'mail';
    try {
      const dbRef = ref(rtdb, path);
      const newRef = push(dbRef);
      await set(newRef, {
        to,
        message: {
          subject,
          text,
          html: html || text
        },
        createdAt: rtdbTimestamp()
      });
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  },

  /**
   * Logs a payment request
   */
  async createStripeCheckout(userId: string, amount: number, currency: string = 'ZAR') {
    const path = `users/${userId}/checkout_sessions`;
    try {
      const dbRef = ref(rtdb, path);
      const newRef = push(dbRef);
      await set(newRef, {
        mode: 'payment',
        amount: amount * 100, // Stripe uses cents
        currency,
        success_url: window.location.origin + '/success',
        cancel_url: window.location.origin + '/cancel',
        createdAt: rtdbTimestamp()
      });
      return newRef.key;
    } catch (err) {
      handleRTDBError(err, OperationType.CREATE, path);
    }
  }
};
