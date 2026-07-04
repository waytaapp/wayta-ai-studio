import { z } from 'zod';

export const VenueSchema = z.object({
  name: z.string().min(2).max(100),
  location_lat: z.number().min(-90).max(90).nullable().optional(),
  location_long: z.number().min(-180).max(180).nullable().optional(),
  address: z.string().min(10),
  service_fee_percent: z.number().min(0).max(100).default(0),
  operating_hours: z.record(z.string(), z.string()).optional()
});

export const PaymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_method: z.enum(['Card', 'Ozow', 'ApplePay', 'GooglePay', 'Stitch', 'PayPal']),
  payment_gateway_ref: z.string().min(5).max(50),
  status: z.enum(['success', 'failed', 'refunded', 'pending_verification'])
});
