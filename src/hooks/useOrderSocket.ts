import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const useOrderSocket = (orderId?: string) => {
  const { socket, joinOrder, isConnected } = useSocket();
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    if (orderId && isConnected) {
      joinOrder(orderId);
    }
  }, [orderId, isConnected, joinOrder]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      if (!orderId || data.orderId === orderId) {
        setLastNotification(data);
      }
    };

    socket.on('order_ready', handler);
    socket.on('order_status_update', handler);
    return () => {
      socket.off('order_ready', handler);
      socket.off('order_status_update', handler);
    };
  }, [socket, orderId]);

  return { lastNotification, isConnected };
};
