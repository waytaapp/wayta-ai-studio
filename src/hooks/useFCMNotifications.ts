import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { saveFcmToken } from '../services/notificationService';
import { auth } from '../lib/firebase';

/**
 * Hook to initialize FCM (Firebase Cloud Messaging) on the client side.
 * Handles permission requests, token lifecycle, and foreground messages.
 */
export function useFCMNotifications() {
  useEffect(() => {
    const setupFCM = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log('🔇 FCM: Skipping setup - no authenticated user');
          return;
        }

        // 1. Request Browser Permission
        console.log('📬 FCM: Requesting notification permission...');
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.warn('⚠️ FCM: Notification permission denied by user');
          return;
        }

        const messaging = getMessaging();
        
        // 2. Retrieve FCM Token
        // NOTE: In a production environment, you MUST generate a VAPID key in the Firebase Console
        // (Project Settings -> Cloud Messaging -> Web configuration) and use it here.
        const VAPID_KEY = 'zK60xCCAnP7Q4Z4A5R8iTcllHa2LRERyE4lUSw_EmMs'; 
        
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });

        if (token) {
          console.log('🎫 FCM: Token generated:', token.substring(0, 10) + '...');
          await saveFcmToken(user.uid, token);
        } else {
          console.warn('⚠️ FCM: No registration token available. Request permission to generate one.');
        }

        // 3. Handle Foreground Messages
        onMessage(messaging, (payload) => {
          console.log('🔔 FCM: Foreground message received:', payload);
          if (payload.notification) {
            const { title, body, icon } = payload.notification;
            new Notification(title || 'Pulse Update', {
              body,
              icon: icon || `${import.meta.env.BASE_URL}favicon.png`,
              tag: 'order-update'
            });
          }
        });
        
      } catch (error) {
        console.error('❌ FCM: Setup failed:', error);
      }
    };

    // Trigger setup when auth state changes (on login)
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setupFCM();
      }
    });

    return () => unsubscribe();
  }, []);
}
