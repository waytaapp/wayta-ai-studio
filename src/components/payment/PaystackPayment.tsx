import React from 'react';
import { usePaystackPayment } from 'react-paystack';
import { paymentService } from '../../services/paymentService';

interface PaystackPaymentProps {
  amount: number; // in Rands
  email: string;
  metadata?: any;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  children: (initializePayment: () => void) => React.ReactNode;
}

export const PaystackPayment: React.FC<PaystackPaymentProps> = ({
  amount,
  email,
  metadata,
  onSuccess,
  onClose,
  children
}) => {
  const publicKey = (import.meta as any).env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_placeholder';
  
  const config = {
    reference: `WAYTA-${new Date().getTime()}-${Math.floor(Math.random() * 1000000)}`,
    email,
    amount: Math.round(amount * 100), // convert to cents
    publicKey,
    currency: 'ZAR',
    metadata,
    label: 'Wayta Order Payment'
  };

  const initializePayment = usePaystackPayment(config);

  const handleSuccess = async (reference: any) => {
    console.log('Paystack Success Callback:', reference);
    try {
      // Best practice: always verify on the backend
      const verification = await paymentService.verifyPaystackPayment(reference.reference);
      if (verification.status && (verification.data.status === 'success' || verification.message === 'Simulated success')) {
        onSuccess(reference.reference);
      } else {
        alert('Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Verification failed', err);
      alert('Could not verify payment. Please try again.');
    }
  };

  const handleClose = () => {
    console.log('Paystack Closed');
    onClose();
  };

  return (
    <>
      {children(() => initializePayment({ onSuccess: handleSuccess, onClose: handleClose }))}
    </>
  );
};
