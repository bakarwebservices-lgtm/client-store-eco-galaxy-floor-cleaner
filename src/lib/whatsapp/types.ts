export type AutoBookMode = 'MANUAL' | 'FULL_AUTO' | 'THRESHOLD';

export type WhatsAppMessageType =
  | 'CONFIRMATION_REQUEST'
  | 'REMINDER_24H'
  | 'DISPATCH_AWB'
  | 'CUSTOMER_REPLY'
  | 'EXPIRED_NOTICE'
  | 'TEST_PING';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface MetaWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: {
          name: string;
        };
        wa_id: string;
      }>;
      messages?: Array<{
        from: string;
        id: string;
        timestamp: string;
        type: 'text' | 'interactive' | 'button' | string;
        text?: {
          body: string;
        };
        interactive?: {
          type: 'button_reply' | 'list_reply';
          button_reply?: {
            id: string; // e.g. "confirm_ORD-1234" | "cancel_ORD-1234"
            title: string;
          };
        };
        button?: {
          text: string;
          payload: string;
        };
      }>;
      statuses?: Array<{
        id: string;
        status: 'sent' | 'delivered' | 'read' | 'failed';
        timestamp: string;
        recipient_id: string;
        errors?: Array<{
          code: number;
          title: string;
          message: string;
        }>;
      }>;
    };
    field: string;
  }>;
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}
