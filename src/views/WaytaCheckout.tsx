import React, { useState, useEffect } from 'react';
import { motion, PanInfo } from 'motion/react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { orderService } from '../services/orderService';
import { PaystackPayment } from '../components/payment/PaystackPayment';
import { PayFastPayment } from '../components/payment/PayFastPayment';
import { CreditCard } from 'lucide-react';

// Mock items
const INITIAL_CART = [
    { id: '1', name: 'Neon Gin Tonic', price: 95, quantity: 2 },
    { id: '2', name: 'Gold Rush Shot', price: 60, quantity: 1 },
];

export const WaytaCheckout: React.FC<{ onComplete?: (status: 'success' | 'failed') => void }> = ({ onComplete }) => {
    const [cart, setCart] = useState(INITIAL_CART);
    const [isPaid, setIsPaid] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (uid && total > 0) {
            orderService.checkBudgetThreshold(uid, total);
        }
    }, [total]);

    const handleUpdateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => 
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        ).filter(item => item.quantity > 0));
    };

    const handleSlide = (_: any, info: PanInfo, initializePayment: () => void) => {
        if (info.offset.x > 200 && !isProcessing) {
            if ('vibrate' in navigator) {
                try {
                    navigator.vibrate([150, 50, 150]);
                } catch (e) {
                    console.log('Vibration failed', e);
                }
            }
            setIsProcessing(true);
            initializePayment();
        }
    };

    const handleSuccessPayment = (reference: string) => {
        setIsPaid(true);
        const email = auth.currentUser?.email;
        if (email) {
            const itemsText = cart.map(item => `${item.quantity}x ${item.name} (R${item.price})`).join('\n');
            const emailBody = `Thank you for your order!\n\nOrder Details:\n${itemsText}\n\nTotal: R${total}\n\nYour order is being prepared dynamically. We will notify you when it's ready.\n\nTransaction verification ref: ${reference}`;
            import('../services/notificationService').then(({ notificationService }) => {
                notificationService.sendEmailNotification(
                    email, 
                    'Your Wayta order is confirmed', 
                    emailBody
                );
            }).catch(e => console.warn('Failed to send confirmation email:', e));
        }
        setTimeout(() => {
            onComplete?.('success');
        }, 800);
    };

    const handlePayFastPrePayment = async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('User not authenticated');

        setIsProcessing(true);
        try {
            // 1. Create a "Pending" order record first to get a linkable ID
            const orderData = {
                user_id: user.uid,
                items: cart.map(c => ({
                    item: { id: c.id, name: c.name, price: c.price, category: 'Other' as const, description: '', image: '' },
                    quantity: c.quantity
                })),
                total_amount: total,
                total: total, // Required for compatibility
                status: 'Pending' as const,
                payment_status: 'Pending' as const,
                venue_id: 'wayta-checkout-default',
                venue_name: 'Wayta Checkout',
                payment_method: 'PayFast'
            };

            const orderId = await orderService.createOrder(orderData, user.email || undefined);

            // 2. Generate the Firestore transaction document with status 'Pending'
            // and link it to the order we just created
            const { transactionService } = await import('../services/transactionService');
            await transactionService.createFirestoreTransaction(user.uid, {
                amount: total,
                status: 'Pending',
                payment_method: 'PayFast',
                category: 'Order',
                date: new Date().toISOString(),
                order_id: orderId
            });

            // 3. Optional: Budget threshold check
            await orderService.checkBudgetThreshold(user.uid, total);
        } catch (err) {
            console.error('Pre-payment processing failed:', err);
            setIsProcessing(false);
            throw err; // Re-throw to stop the redirect in PayFastPayment
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white p-6">
            <h2 className="text-xl font-black uppercase text-primary mb-6">Checkout</h2>
            
            <div className="flex-1 space-y-4">
                {cart.map(item => (
                    <div key={item.id} className="flex justify-between items-center bg-surface-container p-4 rounded-xl border border-outline">
                        <span className="font-bold uppercase text-xs tracking-tight">{item.name}</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => handleUpdateQuantity(item.id, -1)} className="bg-surface-container-high w-8 h-8 rounded-full border border-outline flex items-center justify-center">-</button>
                            <span className="font-mono text-sm">{item.quantity}</span>
                            <button onClick={() => handleUpdateQuantity(item.id, 1)} className="bg-surface-container-high w-8 h-8 rounded-full border border-outline flex items-center justify-center">+</button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <div className="flex justify-between font-black text-lg mb-6">
                    <span>Total</span>
                    <span className="text-primary font-mono tracking-tighter">R{total}</span>
                </div>

                <PaystackPayment
                    amount={total}
                    email={auth.currentUser?.email || 'customer@wayta.co.za'}
                    onSuccess={handleSuccessPayment}
                    onClose={() => {
                        setIsProcessing(false);
                    }}
                >
                    {(initializePayment) => (
                        <div className="relative h-16 bg-surface-container-highest rounded-full overflow-hidden p-2 flex items-center border border-outline">
                            <motion.div 
                                className="absolute left-2 w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-black text-black shadow-lg cursor-pointer"
                                drag="x"
                                dragConstraints={{ left: 0, right: 280 }}
                                dragElastic={0.1}
                                onDragEnd={(e, info) => handleSlide(e, info, initializePayment)}
                            >
                                &gt;&gt;
                            </motion.div>
                            <span className="w-full text-center text-on-surface-variant font-black text-[10px] uppercase tracking-[0.2em] opacity-50">
                                {isProcessing ? "PROCESSING..." : "SLIDE TO PAY"}
                            </span>
                        </div>
                    )}
                </PaystackPayment>

                <div className="mt-4">
                    <PayFastPayment
                        amount={total}
                        onBeforeRedirect={handlePayFastPrePayment}
                    >
                        {(initiatePayFast) => (
                            <button
                                onClick={initiatePayFast}
                                disabled={isProcessing || total <= 0}
                                className="w-full h-14 bg-[#005cb9] hover:bg-[#004a96] disabled:bg-gray-800 disabled:text-gray-500 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all border border-white/10"
                            >
                                <CreditCard size={20} />
                                <span>PAY WITH PAYFAST</span>
                            </button>
                        )}
                    </PayFastPayment>
                </div>
            </div>
        </div>
    );
};
