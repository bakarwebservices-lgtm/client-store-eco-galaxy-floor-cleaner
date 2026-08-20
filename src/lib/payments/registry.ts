import { IPaymentGateway } from './types';
import { CodPaymentGateway } from './adapters/CodAdapter';

class PaymentGatewayRegistry {
  private gateways: Map<string, IPaymentGateway> = new Map();

  constructor() {
    // Register default COD gateway
    this.registerGateway(new CodPaymentGateway());
  }

  registerGateway(gateway: IPaymentGateway): void {
    this.gateways.set(gateway.name.toUpperCase(), gateway);
  }

  getGateway(name: string): IPaymentGateway {
    const gateway = this.gateways.get(name.toUpperCase());
    if (!gateway) {
      throw new Error(`Payment gateway "${name}" is not registered.`);
    }
    return gateway;
  }

  hasGateway(name: string): boolean {
    return this.gateways.has(name.toUpperCase());
  }
}

export const paymentRegistry = new PaymentGatewayRegistry();

export function getPaymentGateway(name: string): IPaymentGateway {
  return paymentRegistry.getGateway(name);
}
