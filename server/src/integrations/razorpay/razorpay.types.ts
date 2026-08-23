export interface RazorpayOrderInput {
  amount: number; // in paise (INR)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  paymentCapture?: boolean;
}

export interface RazorpayOrder {
  id: string;
  entity: 'order';
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status?: string | null;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email: string;
  contact: string;
  notes: Record<string, string>;
  fee?: number;
  tax?: number;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  created_at: number;
}

export interface RazorpayPaymentLinkInput {
  amount: number; // in paise
  currency?: string;
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notify?: {
    sms?: boolean;
    email?: boolean;
  };
  reminder_enable?: boolean;
  notes?: Record<string, string>;
}

export interface RazorpayPaymentLink {
  id: string;
  short_url: string;
  status: 'created' | 'partially_paid' | 'paid' | 'expired' | 'cancelled';
  amount: number;
  amount_paid: number;
  currency: string;
  description: string;
  customer: {
    name?: string;
    email?: string;
    contact?: string;
  };
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPayment;
    };
    order?: {
      entity: RazorpayOrder;
    };
    payment_link?: {
      entity: RazorpayPaymentLink;
    };
  };
  created_at: number;
}
