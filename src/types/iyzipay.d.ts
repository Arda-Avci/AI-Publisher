declare module 'iyzipay' {
  interface IyzipayConfig {
    apiKey: string;
    secretKey: string;
    uri: string;
  }

  interface IyzipayResponse {
    status: string;
    errorMessage?: string;
    token?: string;
    checkoutFormContent?: string;
    paymentPageUrl?: string;
    paymentStatus?: string;
    subscriptionStatus?: string;
    subscriptionReferenceCode?: string;
    referenceCode?: string;
    endDate?: string;
    pricingPlanCode?: string;
  }

  class Iyzipay {
    constructor(config: IyzipayConfig);
    checkoutFormInitialize: {
      create(request: Record<string, unknown>, callback: (err: unknown, result: IyzipayResponse) => void): void;
    };
    checkoutForm: {
      retrieve(request: Record<string, unknown>, callback: (err: unknown, result: IyzipayResponse) => void): void;
    };
    subscriptionCheckoutForm: {
      initialize(request: Record<string, unknown>, callback: (err: unknown, result: IyzipayResponse) => void): void;
      retrieve(request: Record<string, unknown>, callback: (err: unknown, result: IyzipayResponse) => void): void;
    };
    subscriptionCancel: {
      cancel(request: Record<string, unknown>, callback: (err: unknown, result: IyzipayResponse) => void): void;
    };
  }

  export = Iyzipay;
}
