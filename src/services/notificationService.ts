import { httpsCallable } from 'firebase/functions';
import { functions, db, doc, updateDoc, rtdb, ref, update } from '../lib/firebase';

export async function saveFcmToken(userId: string, token: string) {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { fcmToken: token });
    
    const rtdbRef = ref(rtdb, `users/${userId}`);
    await update(rtdbRef, { fcmToken: token });
    
    console.log('✅ FCM token stored successfully in both Firestore and RTDB');
  } catch (err) {
    console.error('❌ Failed to save FCM token:', err);
  }
}

export async function sendOrderReadyNotification(fcmToken: string, orderId: string) {
  try {
    const sendOrderReady = httpsCallable(functions, 'sendOrderReadyNotification');
    const response = await sendOrderReady({ fcmToken, orderId });
    console.log('✅ Order ready notification dispatched via function:', response.data);
    return response.data;
  } catch (err) {
    console.error('❌ Failed to call sendOrderReadyNotification firebase function:', err);
  }
}

export const notificationService = {
  async sendEmailNotification(to: string, subject: string, body: string) {
    try {
      if (!to) {
        console.warn('sendEmailNotification skipped: no recipient address provided');
        return;
      }
      const sendEmail = httpsCallable(functions, 'sendEmailNotification');
      const response = await sendEmail({ to, subject, body });
      console.log('Email notification sent successfully:', response.data);
      return response.data;
    } catch (err) {
      console.error('Failed to send email notification:', err);
    }
  },

  async sendSmsNotification(to: string, message: string) {
    try {
      if (!to) {
        console.warn('sendSmsNotification skipped: no recipient phone number provided');
        return;
      }
      const sendSms = httpsCallable(functions, 'sendSmsNotification');
      const response = await sendSms({ to, message });
      console.log('SMS notification sent successfully:', response.data);
      return response.data;
    } catch (err) {
      console.warn('SMS provider not configured', err);
    }
  }
};
