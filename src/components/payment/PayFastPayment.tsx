import React from 'react';
import { auth } from '../../lib/firebase';
import { transactionService } from '../../services/transactionService';

interface PayFastPaymentProps {
  amount: number;
  onBeforeRedirect: () => Promise<void>;
  children: (initiatePayment: () => void) => React.ReactNode;
}

export const PayFastPayment: React.FC<PayFastPaymentProps> = ({
  amount,
  onBeforeRedirect,
  children
}) => {
  const merchantId = (import.meta as any).env.VITE_PAYFAST_MERCHANT_ID || '10000100';
  const merchantKey = (import.meta as any).env.VITE_PAYFAST_MERCHANT_KEY || '46f0cd694581a';
  const payfastUrl = (import.meta as any).env.VITE_PAYFAST_URL || 'https://sandbox.payfast.co.za/eng/process';

  const initiatePayment = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please sign in to continue.');
        return;
      }

      // 1. Run any additional pre-redirect logic (e.g. creating pending transaction in Firestore)
      // This is now handled by the caller as requested
      await onBeforeRedirect();

      // 2. Prepare PayFast form parameters
      const params: Record<string, string> = {
        merchant_id: merchantId,
        merchant_key: merchantKey,
        amount: amount.toFixed(2),
        item_name: 'Wayta Order',
        return_url: window.location.origin + '/payment/success',
        cancel_url: window.location.origin + '/payment/cancel',
        notify_url: 'https://your-server-api.com/api/payfast/notify', // Placeholder
        email_address: user.email || '',
      };

      // 4. Create and submit hidden form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = payfastUrl;

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error('PayFast initialization failed:', err);
      alert('Failed to initialize PayFast. Please try again.');
    }
  };

  return <>{children(initiatePayment)}</>;
};
