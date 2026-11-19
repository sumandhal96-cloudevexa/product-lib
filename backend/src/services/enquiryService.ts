import type { EnquiryInput, Product } from '../domain/product.ts';
import { NotFoundError } from '../domain/errors.ts';
import type { EmailMessage, EmailSender } from '../ports/emailSender.ts';
import type { ProductProvider } from '../ports/productProvider.ts';
import type { Logger } from '../logger.ts';
import { parseEnquiry } from '../validation/enquiry.ts';

export interface EnquiryOptions {
  salesInbox: string;
  from: string;
}

export class EnquiryService {
  private readonly products: ProductProvider;
  private readonly mailer: EmailSender;
  private readonly options: EnquiryOptions;
  private readonly logger: Logger;

  constructor(products: ProductProvider, mailer: EmailSender, options: EnquiryOptions, logger: Logger) {
    this.products = products;
    this.mailer = mailer;
    this.options = options;
    this.logger = logger;
  }

  /** Validates, checks the product exists, then emails the sales inbox. Rejects if the email was not sent. */
  async submit(input: unknown): Promise<void> {
    const enquiry = parseEnquiry(input);
    const product = await this.products.getProduct(enquiry.productId);
    if (!product) throw new NotFoundError('Product not found');

    await this.mailer.send(buildEnquiryEmail(product, enquiry, this.options));
    // Log the fact, never the customer's details.
    this.logger.info('Enquiry sent', { productId: product.id });
  }
}

/** Header-bound values lose CR/LF so customer input can never inject extra email headers. */
const oneLine = (value: string, max = 200) => value.replace(/[\r\n]+/g, ' ').slice(0, max);

export function buildEnquiryEmail(product: Product, enquiry: EnquiryInput, options: EnquiryOptions): EmailMessage {
  const lines = [
    `New product enquiry`,
    ``,
    `Product: ${oneLine(product.title)} (#${product.id})`,
    `Category: ${oneLine(product.category)}`,
    `Price: ${product.price.toFixed(2)}`,
    ``,
    `Customer: ${oneLine(enquiry.name)}`,
    `Email: ${enquiry.email}`,
    `Phone: ${enquiry.phone ?? 'not provided'}`,
    ``,
    `Message:`,
    enquiry.message,
  ];
  return {
    from: options.from,
    to: options.salesInbox,
    replyTo: oneLine(enquiry.email),
    subject: `Product enquiry: ${oneLine(product.title, 120)} (#${product.id})`,
    text: lines.join('\n'),
  };
}
