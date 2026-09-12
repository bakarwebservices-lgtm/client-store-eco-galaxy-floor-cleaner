import { describe, it, expect } from 'vitest';
import { paymentRegistry, getPaymentGateway } from './registry';
import { BankTransferPaymentGateway } from './adapters/BankTransferAdapter';
import { PaymentStatus } from '@prisma/client';

describe('BankTransferPaymentGateway & Registry', () => {
  it('should be registered in paymentRegistry by default', () => {
    expect(paymentRegistry.hasGateway('BANK_TRANSFER')).toBe(true);
    const gateway = getPaymentGateway('BANK_TRANSFER');
    expect(gateway).toBeDefined();
    expect(gateway.name).toBe('BANK_TRANSFER');
  });

  it('should initiate payment with bank instructions and metadata', async () => {
    const gateway = new BankTransferPaymentGateway();
    const result = await gateway.initiatePayment({
      orderId: 'test-order-1',
      orderNumber: 'ORD-12345',
      amount: 4500,
      currency: 'PKR',
      customerName: 'Ahmad Khan',
    });

    expect(result.success).toBe(true);
    expect(result.paymentMethod).toBe('BANK_TRANSFER');
    expect(result.meta?.method).toBe('BANK_TRANSFER');
    expect(result.meta?.instructions).toContain('IBFT');
  });

  it('should capture payment and mark status as PAID with verification metadata', async () => {
    const gateway = new BankTransferPaymentGateway();
    const result = await gateway.capturePayment({
      orderId: 'test-order-1',
      paymentMeta: { bankName: 'Meezan Bank', accountTitle: 'Store Account' },
    });

    expect(result.success).toBe(true);
    expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    expect(result.meta?.verifiedManually).toBe(true);
  });

  it('should return UNPAID initially until verified', async () => {
    const gateway = new BankTransferPaymentGateway();
    const status = await gateway.getPaymentStatus('test-order-1');
    expect(status).toBe(PaymentStatus.UNPAID);
  });
});
