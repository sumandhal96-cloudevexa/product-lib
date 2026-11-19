export interface EmailMessage {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
}

/**
 * Boundary to the email provider (SMTP/Mailpit today; SES, SendGrid, ... later).
 * Must reject if the message could not be handed off.
 */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
