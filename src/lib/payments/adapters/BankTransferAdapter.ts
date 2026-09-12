import { PaymentStatus } from '@prisma/client';
import {
  IPaymentGateway,
  PaymentInitiationParams,
  PaymentInitiationResult,
  PaymentCaptureParams,
  PaymentRefundParams,
  PaymentResult,
} from '../types';

export class BankTransferPaymentGateway implements IPaymentGateway {
  readonly name = 'BANK_TRANSFER';

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    return {
      success: true,
      paymentMethod: 'BANK_TRANSFER',
      meta: {
        method: 'BANK_TRANSFER',
        instructions:
          'Transfer total amount via IBFT / Raast / Mobile banking and send payment receipt screenshot to WhatsApp for verification.',
        initiatedAt: new Date().toISOString(),
      },
    };
  }

  async capturePayment(params: PaymentCaptureParams): Promise<PaymentResult> {
    return {
      success: true,
      paymentStatus: PaymentStatus.PAID,
      meta: {
        capturedAt: new Date().toISOString(),
        verifiedManually: true,
        ...params.paymentMeta,
      },
    };
  }

  async refundPayment(params: PaymentRefundParams): Promise<PaymentResult> {
    return {
      success: true,
      paymentStatus: PaymentStatus.REFUNDED,
      meta: {
        refundedAt: new Date().toISOString(),
        reason: params.reason,
      },
    };
  }

  async getPaymentStatus(_orderId: string): Promise<PaymentStatus> {
    return PaymentStatus.UNPAID;
  }
}
