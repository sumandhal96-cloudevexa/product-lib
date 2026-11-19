import nodemailer from 'nodemailer';
import { UpstreamError } from '../domain/errors.ts';
import type { EmailMessage, EmailSender } from '../ports/emailSender.ts';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

/** SMTP adapter: Mailpit locally, Amazon SES SMTP endpoint (or any SMTP relay) in AWS. */
export class SmtpEmailSender implements EmailSender {
  private readonly transport: nodemailer.Transporter;

  constructor(options: SmtpOptions) {
    this.transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: options.user && options.pass ? { user: options.user, pass: options.pass } : undefined,
      connectionTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transport.sendMail({
        from: message.from,
        to: message.to,
        replyTo: message.replyTo,
        subject: message.subject,
        text: message.text,
      });
    } catch {
      // Detail (which may include addresses) is deliberately not propagated.
      throw new UpstreamError('EMAIL_FAILED', 'Could not send your enquiry right now');
    }
  }
}
