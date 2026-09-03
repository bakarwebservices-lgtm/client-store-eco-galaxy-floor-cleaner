import { PaymentStatus } from '@prisma/client';

export interface PaymentInitiationParams {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentInitiationResult {
  success: boolean;
  paymentMethod: string;
  redirectUrl?: string;
  transactionId?: string;
  meta?: Record<string, any>;
  error?: string;
}

export interface PaymentCaptureParams {
  orderId: string;
  paymentMeta: Record<string, any>;
}

export interface PaymentRefundParams {
  orderId: string;
  amount: number;
  reason?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  meta?: Record<string, any>;
  error?: string;
}

export interface IPaymentGateway {
  readonly name: string;
  initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult>;
  capturePayment(params: PaymentCaptureParams): Promise<PaymentResult>;
  refundPayment(params: PaymentRefundParams): Promise<PaymentResult>;
  getPaymentStatus(orderId: string): Promise<PaymentStatus>;
}
