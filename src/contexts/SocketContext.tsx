import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Sparkles, Fingerprint, Users, Check, Zap, Cpu, Server, Send, RefreshCw, Terminal, ArrowRight } from 'lucide-react';

interface SocketContextType {
  socket: Socket | null;
  joinOrder: (orderId: string) => void;
  joinUser: (userId: string) => void;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  joinOrder: () => {},
  joinUser: () => {},
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

const SocketManager: React.FC<{ userId?: string }> = ({ userId }) => {
  const { joinUser, isConnected } = useSocket();
  
  useEffect(() => {
    if (userId && isConnected) {
      joinUser(userId);
    }
  }, [userId, isConnected, joinUser]);

  return null;
};

export const SocketProvider: React.FC<{ children: React.ReactNode, userId?: string }> = ({ children, userId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notification, setNotification] = useState<{orderId: string, message: string} | null>(null);

  useEffect(() => {
    let newSocket: Socket | null = null;
    try {
      // In production, the socket server is the same as the web server
      newSocket = io(window.location.origin, {
        transports: ['polling', 'websocket'],
        autoConnect: true,
        reconnectionDelayMax: 10000,
        timeout: 15000,
      });

      newSocket.on('connect', () => {
        console.log('🔌 Socket connected locally');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        const errorDetails = {
          message: error.message,
          name: error.name,
          type: (error as any).type,
          description: (error as any).description,
          context: (error as any).context
        };
        console.warn('🔌 WebSocket connection warning:', errorDetails);
        
        // Dispatch custom event for system monitoring
        window.dispatchEvent(new CustomEvent('WAYTA_SOCKET_ERROR', { 
          detail: { type: 'connect_error', ...errorDetails } 
        }));
      });

      newSocket.on('error', (error) => {
        console.error('🔌 WebSocket general error:', error);
        
        // Attempt to stringify if it's an object to avoid [object Object] in logs
        if (error && typeof error === 'object') {
          try {
            console.error('🔍 WebSocket Error Details:', JSON.stringify(error, null, 2));
          } catch (e) {}
        }

        window.dispatchEvent(new CustomEvent('WAYTA_SOCKET_ERROR', { 
          detail: { type: 'error', error: typeof error === 'string' ? error : (error as any)?.message || 'Unknown' } 
        }));
      });

      // Global listener for order status update
      newSocket.on('order_status_update', (data) => {
        console.log('🔄 Order Status Update Received:', data);
        
        // Update notification if it's a significant status or if we want transparency
        if (data.status === 'ready' || data.status === 'completed' || data.status === 'processing') {
          setNotification(data);
        }

        // Handle system notification
        if ("Notification" in window && Notification.permission === "granted" && (data.status === 'ready' || data.status === 'completed')) {
          new Notification(`Pulse Update | Order ${data.status.toUpperCase()}`, {
            body: data.message,
            icon: `${import.meta.env.BASE_URL}favicon.png`
          });
        }
        
        // Dispatch custom event for UI components
        const event = new CustomEvent('WAYTA_ORDER_STATUS_UPDATE', { detail: data });
        window.dispatchEvent(event);

        // Legacy support for specific ready event
        if (data.status === 'ready') {
          const readyEvent = new CustomEvent('WAYTA_ORDER_READY', { detail: data });
          window.dispatchEvent(readyEvent);
        }

        if (data.status === 'ready' || data.status === 'completed') {
          setTimeout(() => setNotification(null), 8000);
        } else {
          setTimeout(() => setNotification(null), 4000);
        }
      });

      // Global listener for order ready (Legacy support if server still sends it directly)
      newSocket.on('order_ready', (data) => {
        console.log('🎁 Order Ready Event Received:', data);
        
        setNotification(data);

        // Handle the notification logic here (Branded Toast)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Pulse Update | Order Ready", {
            body: data.message,
            icon: `${import.meta.env.BASE_URL}favicon.png`
          });
        }
        
        // Dispatch custom event for UI components to listen to
        const event = new CustomEvent('WAYTA_ORDER_READY', { detail: data });
        window.dispatchEvent(event);

        // Auto-hide after 8 seconds for longer visibility
        setTimeout(() => setNotification(null), 8000);
      });

      // Test Mode: ORDER_SUBMITTED and STATUS_UPDATED real-time custom socket listeners for simulated views
      newSocket.on('ORDER_SUBMITTED', (data) => {
        console.log('📢 Socket received ORDER_SUBMITTED:', data);
        const event = new CustomEvent('WAYTA_ORDER_SUBMITTED', { detail: data });
        window.dispatchEvent(event);
      });

      newSocket.on('STATUS_UPDATED', (data) => {
        console.log('📢 Socket received STATUS_UPDATED:', data);
        const event = new CustomEvent('WAYTA_STATUS_UPDATED', { detail: data });
        window.dispatchEvent(event);
      });

      setSocket(newSocket);
    } catch (e) {
      console.warn('🔌 WebSocket construction failed defensively:', e);
    }

    return () => {
      if (newSocket) {
        try {
          newSocket.close();
        } catch (_) {}
      }
    };
  }, []);

  const joinOrder = useCallback((orderId: string) => {
    if (socket && isConnected) {
      socket.emit('join_order', orderId);
      console.log(`📡 Joined order tracking: ${orderId}`);
    }
  }, [socket, isConnected]);

  const joinUser = useCallback((userId: string) => {
    if (socket && isConnected) {
      socket.emit('join_user', userId);
      console.log(`📡 Joined personal notification channel: ${userId}`);
    }
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider value={{ socket, joinOrder, joinUser, isConnected }}>
      <SocketManager userId={userId} />
      {children}
      <TestModeHub socket={socket} />
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -120, opacity: 0, scale: 0.95 }}
            className="fixed top-24 left-4 right-4 z-[200] max-w-sm mx-auto"
          >
            <div className="bg-black/90 backdrop-blur-xl border border-primary/30 rounded-2xl p-4 shadow-[0_0_40px_rgba(249,115,22,0.15)] overflow-hidden relative group">
              {/* Progress Bar Background */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 8, ease: "linear" }}
                  className="h-full bg-primary"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-black">
                    <Bell size={24} className="animate-bounce" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-black rounded-full animate-pulse" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Pulse Notification</p>
                  </div>
                  <p className="text-white text-sm font-bold leading-tight">
                    {notification.message}
                  </p>
                </div>

                <button 
                  onClick={() => setNotification(null)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Technical Accents */}
              <div className="absolute top-0 right-12 w-[1px] h-2 bg-primary/20" />
              <div className="absolute top-2 right-0 w-8 h-[1px] bg-primary/20" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SocketContext.Provider>
  );
};

const TestModeHub: React.FC<{ socket: Socket | null }> = ({ socket }) => {
  const [isTestModeActive, setIsTestModeActive] = useState(() => {
    return localStorage.getItem('isTestMode') === 'true';
  });
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] 🔌 WS real-time simulation initialized on port: 3000`
  ]);
  const [simulatedOrders, setSimulatedOrders] = useState<any[]>([
    { id: "sim-201", customer_name: "Gavin Naidoo [VIP]", items: "2x Double Cream Gin & Tonic", status: "Pending", order_number: "2234" },
    { id: "sim-202", customer_name: "Lindiwe Dlamini", items: "1x Wayta Sunset Margarita", status: "Pending", order_number: "4412" }
  ]);
  const [patronStatusCopy, setPatronStatusCopy] = useState("Connected over secured WebSocket. Standard queue bypassed.");
  const [bartenderStatusCopy, setBartenderStatusCopy] = useState("Awaiting prepare queue...");
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    const handleTestModeChange = (e: Event) => {
      const isEnabled = (e as CustomEvent).detail?.enabled;
      setIsTestModeActive(isEnabled);
    };

    const handleOrderSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const cleanTime = new Date().toLocaleTimeString();
      setLogs(prev => [
        `[${cleanTime}] 📨 RECV ORDER_SUBMITTED broadcast from server for #${detail.order_number}`,
        ...prev.slice(0, 15)
      ]);
      setSimulatedOrders(prev => {
        if (prev.some(o => o.id === detail.id)) return prev;
        return [detail, ...prev];
      });
      setBartenderStatusCopy(`NEW SIMULATED ORDER: ${detail.items} by ${detail.customer_name}`);
      addSimToast(`🛎️ Recv order from ${detail.customer_name}: ${detail.items}`, 'bartender');
    };

    const handleStatusSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const cleanTime = new Date().toLocaleTimeString();
      setLogs(prev => [
        `[${cleanTime}] 📨 RECV STATUS_UPDATED (${detail.status}) broadcast from server for client ${detail.customer_name}`,
        ...prev.slice(0, 15)
      ]);
      setSimulatedOrders(prev => prev.map(o => {
        if (o.id === detail.orderId) {
          return { ...o, status: detail.status };
        }
        return o;
      }));
      setPatronStatusCopy(`Bartender set '${detail.items}' to ${detail.status.toUpperCase()}! Queue bypassed!`);
      addSimToast(`🍹 ${detail.customer_name}'s drink is now ${detail.status.toUpperCase()}`, 'patron');
    };

    window.addEventListener('WAYTA_TEST_MODE_CHANGED', handleTestModeChange);
    window.addEventListener('WAYTA_ORDER_SUBMITTED', handleOrderSync);
    window.addEventListener('WAYTA_STATUS_UPDATED', handleStatusSync);

    return () => {
      window.removeEventListener('WAYTA_TEST_MODE_CHANGED', handleTestModeChange);
      window.removeEventListener('WAYTA_ORDER_SUBMITTED', handleOrderSync);
      window.removeEventListener('WAYTA_STATUS_UPDATED', handleStatusSync);
    };
  }, []);

  const addSimToast = (message: string, system: 'patron' | 'bartender') => {
    const freshId = Math.random().toString();
    setToasts(prev => [...prev, { id: freshId, message, system }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== freshId));
    }, 4500);
  };

  if (!isTestModeActive) return null;

  const handleSimulateSubmit = (beverage: string, buyer: string) => {
    if (!socket) {
      alert("WebSocket connection is offline.");
      return;
    }
    const orderNum = String(Math.floor(1000 + Math.random() * 9000));
    const orderId = 'sim-' + Math.floor(1000 + Math.random() * 9000);
    const orderPayload = {
      id: orderId,
      customer_name: buyer,
      items: beverage,
      status: 'Pending',
      order_number: orderNum,
      isVip: buyer.includes('[VIP]'),
      timestamp: new Date().toISOString()
    };
    
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] 📤 EMIT ORDER_SUBMITTED sequence for payload #${orderNum}`, ...prev.slice(0, 15)]);
    socket.emit("ORDER_SUBMITTED", orderPayload);
  };

  const handleSimulateFulfill = (orderIdx: number, newStatus: string) => {
    if (!socket) {
      alert("WebSocket connection is offline.");
      return;
    }
    const order = simulatedOrders[orderIdx];
    if (!order) return;

    const statusPayload = {
      orderId: order.id,
      customer_name: order.customer_name,
      items: order.items,
      status: newStatus
    };

    setLogs(prev => [`[${new Date().toLocaleTimeString()}] 📤 EMIT STATUS_UPDATED (${newStatus}) sequence for #${order.order_number}`, ...prev.slice(0, 15)]);
    socket.emit("STATUS_UPDATED", statusPayload);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[250] font-sans">
      {/* Toast Overlay for Simulated views */}
      <div className="fixed bottom-24 right-6 z-[300] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className={`p-3 rounded-xl border shadow-lg flex items-center gap-2 text-xs font-bold ${
                t.system === 'patron' 
                  ? 'bg-amber-950/95 border-amber-500/40 text-amber-200' 
                  : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <Zap size={14} className={t.system === 'patron' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'} />
              <div>
                <span className="uppercase text-[8px] tracking-widest font-black block opacity-60">
                  {t.system === 'patron' ? '👤 Simulated Patron' : '🍹 Simulated Bartender'}
                </span>
                {t.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            layoutId="sandboxHubContainer"
            onClick={() => setIsOpen(true)}
            className="h-12 px-4 rounded-full bg-neutral-900 border border-amber-500/30 text-amber-500 hover:border-amber-500 hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.15)] font-black text-xs uppercase tracking-widest cursor-pointer"
          >
            <Cpu size={14} className="animate-spin text-amber-500" style={{ animationDuration: '8s' }} />
            <span>WebSocket Live Simulator</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse border border-neutral-900" />
          </motion.button>
        ) : (
          <motion.div
            layoutId="sandboxHubContainer"
            className="w-full max-w-[560px] bg-neutral-950 border border-neutral-800 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/80 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Cpu size={16} />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-white leading-tight font-sans">WS Live Simulation Hub</h4>
                  <p className="text-[9px] font-semibold text-neutral-400 uppercase tracking-wider">Test Mode Active</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Split Views Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-neutral-800 font-sans">
              
              {/* Left Column: Simulated Patron Panel */}
              <div className="p-5 border-b sm:border-b-0 sm:border-r border-neutral-800 flex flex-col">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Simulated Patron View</span>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-3 mb-4 flex-1">
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-1">Queue Status Microcopy</p>
                  <p className="text-[10px] font-bold text-neutral-200 leading-normal flex items-start gap-1">
                    <span className="text-amber-500">➔</span> {patronStatusCopy}
                  </p>
                </div>

                {/* Submit Simulator Button Block */}
                <div className="space-y-2 mt-auto">
                  <p className="text-[8px] font-black uppercase tracking-widest text-neutral-500">Simulate Order Actions</p>
                  <button
                    onClick={() => handleSimulateSubmit("Double Patron Tequila Sunrise", "Sipho Khumalo [VIP]")}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send size={11} className="fill-black" />
                    Simulate VIP Order Submit
                  </button>
                  <button
                    onClick={() => handleSimulateSubmit("1x Premium Ginger Brew", "Abrie van der Merwe")}
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Simulate Regular Order Submit
                  </button>
                </div>
              </div>

              {/* Right Column: Simulated Bartender Panel */}
              <div className="p-5 flex flex-col bg-neutral-900/10">
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500">Simulated Bartender View</span>
                </div>

                {/* Mini Prep Queue Stack */}
                <div className="flex-1 flex flex-col mb-4">
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-1.5">Preparation Stack Queue</p>
                  <div className="max-h-[110px] overflow-y-auto space-y-1.5 text-[9px] flex-1">
                    {simulatedOrders.length === 0 ? (
                      <p className="text-neutral-600 italic font-medium">No pending simulated orders...</p>
                    ) : (
                      simulatedOrders.map((o, index) => (
                        <div key={`${o.id ?? o.uid ?? o.name ?? index}-${index}`} className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-lg flex items-center justify-between gap-1">
                          <div className="min-w-0 pr-1">
                            <span className="block font-black text-neutral-300 truncate">{o.customer_name}</span>
                            <span className="block text-neutral-500 font-medium truncate">{o.items}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                              o.status === 'Pending' || o.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-500' 
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                              {o.status}
                            </span>
                            {(o.status === 'Pending' || o.status === 'pending') && (
                              <button
                                onClick={() => handleSimulateFulfill(index, 'ready')}
                                className="px-1.5 py-0.5 bg-emerald-500 text-black hover:bg-emerald-400 font-black uppercase text-[7px] rounded cursor-pointer"
                              >
                                Ready
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl p-3 mt-auto">
                  <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-1">Queue Status Microcopy</p>
                  <p className="text-[10px] font-bold text-neutral-200 leading-normal flex items-start gap-1">
                    <span className="text-emerald-500">➔</span> {bartenderStatusCopy}
                  </p>
                </div>
              </div>
            </div>

            {/* Realtime WebSocket Packet Logs Monitor footer */}
            <div className="bg-neutral-950 p-4 border-t border-neutral-900">
              <div className="flex items-center gap-1.5 mb-2">
                <Terminal size={12} className="text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-500">WS Live Broadcast Packet Logs Monitor</span>
              </div>
              <div className="bg-neutral-900 px-3 py-2 rounded-xl text-[8px] font-mono text-emerald-400/90 h-[55px] overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="truncate border-l-2 border-emerald-500/30 pl-1.5 leading-relaxed">{log}</div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
