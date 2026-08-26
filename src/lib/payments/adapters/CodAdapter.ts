import { PaymentStatus } from '@prisma/client';
import { IPaymentGateway, PaymentInitiationParams, PaymentInitiationResult, PaymentCaptureParams, PaymentRefundParams, PaymentResult } from '../types';

export class CodPaymentGateway implements IPaymentGateway {
  readonly name = 'COD';

  async initiatePayment(params: PaymentInitiationParams): Promise<PaymentInitiationResult> {
    return {
      success: true,
      paymentMethod: 'COD',
      meta: {
        method: 'COD',
        instructions: 'Pay cash upon package delivery at your doorstep.',
        initiatedAt: new Date().toISOString(),
      },
    };
  }

  async capturePayment(params: PaymentCaptureParams): Promise<PaymentResult> {
    // COD is paid upon courier fulfillment
    return {
      success: true,
      paymentStatus: PaymentStatus.PAID,
      meta: { capturedAt: new Date().toISOString() },
    };
  }

  async refundPayment(params: PaymentRefundParams): Promise<PaymentResult> {
    return {
      success: true,
      paymentStatus: PaymentStatus.REFUNDED,
      meta: { refundedAt: new Date().toISOString(), reason: params.reason },
    };
  }

  async getPaymentStatus(_orderId: string): Promise<PaymentStatus> {
    return PaymentStatus.UNPAID;
  }
}
