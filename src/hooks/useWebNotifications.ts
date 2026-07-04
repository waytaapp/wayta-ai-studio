import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';

export const useWebNotifications = () => {
  useEffect(() => {
    if (!messaging) return;

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          // Get FCM Token (Optional: Send this to your server to target specific users)
          // const token = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
          // console.log('FCM Token:', token);
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    // Handle incoming messages while the app is in the foreground
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Use browser notification
      if (payload.notification) {
        new Notification(payload.notification.title || "Wayta Update", {
          body: payload.notification.body,
          icon: `${import.meta.env.BASE_URL}favicon.png`
        });
      }
    });

    requestPermission();
    return () => unsubscribe();
  }, []);
};
