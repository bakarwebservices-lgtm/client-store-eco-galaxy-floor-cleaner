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

describe('CodPaymentGateway & COD Settings Schema', () => {
  it('should be registered in paymentRegistry by default', () => {
    expect(paymentRegistry.hasGateway('COD')).toBe(true);
    const gateway = getPaymentGateway('COD');
    expect(gateway).toBeDefined();
    expect(gateway.name).toBe('COD');
  });

  it('initiates COD payment with doorstep delivery instructions', async () => {
    const gateway = getPaymentGateway('COD');
    const result = await gateway.initiatePayment({
      orderId: 'test-cod-1',
      orderNumber: 'ORD-99999',
      amount: 3200,
      currency: 'PKR',
      customerName: 'Fatima Noor',
    });

    expect(result.success).toBe(true);
    expect(result.paymentMethod).toBe('COD');
    expect(result.meta?.instructions).toContain('cash');
  });

  it('validates default COD settings through paymentSettingsSchema', async () => {
    const { paymentSettingsSchema } = await import('../validation/settings');
    const parsed = paymentSettingsSchema.parse({});
    expect(parsed['payment.cod_enabled']).toBe(true);
    expect(parsed['payment.cod_title']).toBe('Cash on Delivery (COD)');
    expect(parsed['payment.cod_fee']).toBe(0);
    expect(parsed['payment.cod_max_limit']).toBe(0);
  });
});
