import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  CreditCard, 
  Smartphone, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  MapPin, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { PaymentSchema } from '../lib/validation';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { z } from 'zod';
import { cn } from '../lib/utils';
import { User } from '../types';

type PaymentFormData = z.infer<typeof PaymentSchema>;

interface PaymentScreenProps {
  orderId: string;
  totalAmount: number;
  user: User | null;
  onSuccess: (transactionId: string) => void;
  onCancel?: () => void;
  onCompleteProfile?: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({ 
  orderId, 
  totalAmount, 
  user,
  onSuccess, 
  onCancel,
  onCompleteProfile
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmedArrival, setConfirmedArrival] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PaymentFormData>({
    resolver: zodResolver(PaymentSchema),
    defaultValues: {
      order_id: orderId,
      amount: totalAmount,
      status: 'success', // For demo purposes, we default to success
      payment_gateway_ref: `REF-${Math.random().toString(36).substring(7).toUpperCase()}`
    }
  });

  const selectedMethod = watch('payment_method');
  const isCashlessLocked = typeof window !== 'undefined' && localStorage.getItem('isCashlessLocked') === 'true';

  const onSubmit = async (data: PaymentFormData) => {
    if (isCashlessLocked) {
      setServerError("CASHLESS CHANNEL LOCKOUT: Payment gateways are temporarily suspended.");
      return;
    }

    if (!confirmedArrival) {
      setServerError("Please confirm you are at the venue before payment.");
      return;
    }

    setIsProcessing(true);
    setServerError(null);
    
    try {
      if (data.payment_method === 'Stitch') {
        const response = await fetch('/api/payments/stitch/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: data.amount,
            reference: data.payment_gateway_ref,
            orderId: data.order_id
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Stitch initiation failed');
        }
        
        window.location.href = result.paymentUrl;
        return;
      }

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      // Simulate a small delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSuccess(result.transaction_id);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const paymentMethods = [
    { id: 'Card', name: 'Credit / Debit Card', icon: CreditCard },
    { id: 'PayPal', name: 'PayPal Business (USD/Int)', icon: CreditCard },
    { id: 'Stitch', name: 'Stitch (Pay by Bank)', icon: Smartphone },
    { id: 'Ozow', name: 'Ozow Instant EFT', icon: Smartphone },
    { id: 'ApplePay', name: 'Apple Pay', icon: Smartphone },
    { id: 'GooglePay', name: 'Google Pay', icon: Smartphone },
  ] as const;

  const isProfileIncomplete = !user?.gender || !user?.id_number || !user?.is_profile_complete;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-20 flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight italic">Checkout</h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Order Sequence Finalization</p>
        </div>
        {onCancel && (
          <button 
            onClick={onCancel}
            className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowRight className="rotate-180" size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col max-w-md mx-auto w-full space-y-8">
        {/* Profile Completion Incentive */}
        {isProfileIncomplete && (
          <button 
            type="button"
            onClick={onCompleteProfile}
            className="group relative bg-[#F97316]/5 border border-[#F97316]/20 rounded-2xl p-6 overflow-hidden transition-all hover:bg-[#F97316]/10"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
              <Sparkles size={48} className="text-[#F97316]" />
            </div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-[#F97316] flex items-center justify-center shrink-0 shadow-lg shadow-[#F97316]/20">
                <UserCheck size={24} className="text-white" />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-black uppercase text-[#F97316] tracking-tight">Identity Reward Available</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 leading-relaxed">
                  Complete your identity profile to earn <span className="text-white">50 Wayta Credit</span> & faster terminal processing.
                </p>
              </div>
            </div>
          </button>
        )}

        {/* Order Summary */}
        <div className="bg-gray-900/40 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Total Amount</div>
          <div className="text-5xl font-black text-white flex items-baseline tracking-tighter">
            <span className="text-xl font-medium mr-1 text-orange-500">R</span>
            {totalAmount.toFixed(2)}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
               <ShieldCheck size={14} className="text-emerald-500" />
               <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Encrypted Pulse</span>
            </div>
            <span className="text-[10px] font-mono text-gray-400 font-bold">#{orderId.substring(0, 8)}</span>
          </div>
        </div>

        {/* Arrival Confirmation */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-500 block uppercase tracking-[0.3em] px-1">
            Mesh Location Check
          </label>
          <button
            type="button"
            onClick={() => setConfirmedArrival(!confirmedArrival)}
            className={cn(
              "w-full flex items-center p-5 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden",
              confirmedArrival 
                ? "bg-emerald-500/10 border-emerald-500/50 text-white shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700 hover:bg-gray-900"
            )}
          >
            <div className={cn(
              "p-2.5 rounded-xl mr-4 transition-colors",
              confirmedArrival ? "bg-emerald-500 text-white" : "bg-gray-800 text-gray-600"
            )}>
              <MapPin size={20} />
            </div>
            <div className="flex-1">
               <span className="font-black text-xs uppercase tracking-widest block">I am at the venue</span>
               <span className="text-[9px] font-bold opacity-60 uppercase tracking-tighter">Required for sequence authorization</span>
            </div>
            <div className={cn(
              "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
              confirmedArrival ? "bg-emerald-500 border-emerald-400 scale-110" : "border-gray-700"
            )}>
              {confirmedArrival && <CheckCircle size={14} />}
            </div>
          </button>
        </div>

        {/* Payment Method Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-gray-500 block uppercase tracking-[0.3em] px-1">
            Wallet Selection
          </label>
          
          <div className="grid grid-cols-1 gap-2.5">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setValue('payment_method', method.id, { shouldValidate: true })}
                className={cn(
                  "w-full flex items-center p-4 rounded-2xl border transition-all duration-200 text-left",
                  selectedMethod === method.id 
                    ? "bg-orange-500/10 border-orange-500/50 text-white shadow-[0_0_20px_rgba(249,115,22,0.1)]" 
                    : "bg-gray-900/50 border-gray-800 text-gray-500 hover:border-gray-700"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl mr-4",
                  selectedMethod === method.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-gray-800 text-gray-500"
                )}>
                  <method.icon size={20} />
                </div>
                <span className="font-black text-[10px] uppercase tracking-widest flex-1">{method.name}</span>
                {selectedMethod === method.id && (
                  <CheckCircle size={20} className="text-orange-500" />
                )}
              </button>
            ))}
          </div>
          
          {errors.payment_method && (
            <p className="mt-2 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center px-1">
              <AlertCircle size={14} className="mr-2" />
              {errors.payment_method.message}
            </p>
          )}
        </div>

        {/* Gateway Ref (Hidden/Auto) */}
        <input type="hidden" {...register('order_id')} />
        <input type="hidden" {...register('amount')} />
        <input type="hidden" {...register('status')} />
        <input type="hidden" {...register('payment_gateway_ref')} />

        {/* Cashless Channel Lockout Warning */}
        {isCashlessLocked && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-start">
            <AlertCircle size={18} className="mr-3 flex-shrink-0 text-red-500" />
            <div className="space-y-1">
              <span className="font-black text-xs block">Cashless Platform Suspended</span>
              <p className="font-semibold text-gray-400 normal-case text-[10px] leading-relaxed">
                The platform operator has triggered a global cashless channel lockout. New card and third-party transactions are temporarily frozen.
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {serverError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 mb-6 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-start">
            <AlertCircle size={18} className="mr-3 flex-shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Pay Button */}
        <div className="pt-4">
          {selectedMethod === 'PayPal' ? (
            <div className="space-y-4 bg-gray-900/40 p-4 rounded-2xl border border-gray-800">
              <div className="text-center mb-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">PayPal Secure Checkout</span>
                <span className="text-[9px] text-orange-500 font-bold uppercase block mt-1">
                  Est. ${(totalAmount / 18.5).toFixed(2)} USD (@ 1 USD = R18.5)
                </span>
              </div>
              <PayPalScriptProvider options={{ 
                clientId: (import.meta as any).env.VITE_PAYPAL_CLIENT_ID || "sb",
                currency: "USD",
                intent: "capture"
              }}>
                <PayPalButtons 
                  style={{ layout: "vertical", color: "gold", shape: "rect", label: "pay" }}
                  disabled={!confirmedArrival || isProcessing || isCashlessLocked}
                  createOrder={async () => {
                    if (!confirmedArrival) {
                      setServerError("Please confirm you are at the venue before payment.");
                      throw new Error("Confirm arrival is required");
                    }
                    try {
                      const response = await fetch('/api/payments/paypal/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          amount: totalAmount,
                          reference: watch('payment_gateway_ref')
                        })
                      });
                      const data = await response.json();
                      if (!response.ok || !data.success) {
                        throw new Error(data.error || 'Failed to create PayPal order');
                      }
                      return data.orderId;
                    } catch (err: any) {
                      setServerError(err.message || 'PayPal initiation failed');
                      throw err;
                    }
                  }}
                  onApprove={async (data, actions) => {
                    setIsProcessing(true);
                    setServerError(null);
                    try {
                      const response = await fetch('/api/payments/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderId: data.orderID
                        })
                      });
                      const captureData = await response.json();
                      if (!response.ok || !captureData.success) {
                        throw new Error(captureData.error || 'PayPal capture failed');
                      }
                      
                      // Complete transaction details
                      const finalData = {
                        order_id: orderId,
                        amount: totalAmount,
                        payment_method: 'PayPal' as any,
                        payment_gateway_ref: captureData.transactionId,
                        status: 'success'
                      };
                      
                      const recordResponse = await fetch('/api/payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(finalData)
                      });
                      
                      if (!recordResponse.ok) {
                        throw new Error('Payment capture succeeded, but could not register transaction');
                      }
                      
                      // Success delay
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      onSuccess(captureData.transactionId);
                    } catch (err: any) {
                      setServerError(err.message || 'PayPal capture error');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  onError={(err) => {
                    console.error("PayPal button error:", err);
                    setServerError("PayPal payment failed or was cancelled.");
                  }}
                />
              </PayPalScriptProvider>
            </div>
          ) : (
            <button
              type="submit"
              disabled={isProcessing || isCashlessLocked}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-300 flex items-center justify-center shadow-2xl relative overflow-hidden",
                (isProcessing || isCashlessLocked) 
                  ? "bg-gray-900 text-gray-600 cursor-not-allowed" 
                  : "bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98] shadow-orange-500/20"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin mr-3" size={20} />
                  Decrypting Balance...
                </>
              ) : (
                `Authorize R${totalAmount.toFixed(2)}`
              )}
            </button>
          )}
          
          <p className="mt-6 text-center text-gray-700 text-[8px] font-black uppercase tracking-[0.4em]">
            Verified Connection • 256-Bit Pulse Encryption
          </p>
        </div>
      </form>
    </div>
  );
};

