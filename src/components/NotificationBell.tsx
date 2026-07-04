import React, { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, collection, query, where, onSnapshot, updateDoc, doc, rtdb, ref as rRef, onValue, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  timestamp: any;
}

export const NotificationBell: React.FC<{ userId: string, isDark?: boolean }> = ({ userId, isDark = true }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!userId) return;

    // Use Firestore for notifications or RTDB. User request mentions subcollections.
    // Let's use Firestore notifications collection where targetUserId == userId
    const q = query(collection(db, 'notifications'), where('targetUserId', '==', userId));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      setNotifications(data.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return () => unsub();
  }, [userId]);

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await updateDoc(doc(db, 'notifications', n.id), { read: true });
    }
  };

  const markRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && unreadCount > 0) {
            // Optional: mark all read when opening? No, let user do it explicitly or on click
          }
        }}
        className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative",
          "bg-surface-container border border-outline text-on-surface"
        )}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-black animate-in zoom-in">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className={cn(
              "absolute right-0 mt-4 w-80 max-h-[480px] overflow-hidden rounded-[2rem] border shadow-2xl z-[100] flex flex-col",
              "bg-surface-container-high border-outline"
            )}
          >
            <div className="p-5 border-b border-outline/10 flex justify-between items-center bg-surface-container shrink-0">
               <h3 className="text-xs font-black uppercase tracking-widest italic">Notifications</h3>
               {unreadCount > 0 && (
                 <button onClick={markAllRead} className="text-[9px] font-black uppercase text-primary hover:underline">Mark all read</button>
               )}
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
               {notifications.length === 0 ? (
                 <div className="p-12 text-center opacity-30">
                    <Bell size={32} className="mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No notifications</p>
                 </div>
               ) : (
                 notifications.map((n, idx) => (
                   <div 
                     key={`${n.id || 'notif'}-${idx}`} 
                     onClick={() => markRead(n.id)}
                     className={cn(
                       "p-4 border-b border-outline/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer flex gap-4",
                       !n.read && "bg-primary/5"
                     )}
                   >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        !n.read ? "bg-primary" : "bg-on-surface-variant/30"
                      )} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                           <p className={cn("text-xs font-black uppercase tracking-tight", n.read ? "text-on-surface-variant" : "text-on-surface")}>{n.title}</p>
                           {n.read && <Check size={12} className="text-on-surface-variant/60" />}
                        </div>
                        <p className={cn("text-[10px] font-bold leading-relaxed", n.read ? "text-on-surface-variant/70" : "text-on-surface/80")}>{n.message}</p>
                      </div>
                   </div>
                 ))
               )}
            </div>
            
            <div className="p-3 bg-surface-container shrink-0 border-t border-outline/10">
               <button 
                 onClick={() => setIsOpen(false)}
                 className="w-full h-10 border border-outline rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors hover:border-white/20"
               >
                  Close
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
