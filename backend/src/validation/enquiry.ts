import type { EnquiryInput } from '../domain/product.ts';
import { ValidationError } from '../domain/errors.ts';

// Deliberately pragmatic: one "@", a dot in the domain, no whitespace. The mail server is the real judge.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s().-]{5,24}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const LIMITS = { name: 100, email: 254, message: 2000 } as const;

/** Server-side allow-list validation. Returns a clean EnquiryInput or throws ValidationError with per-field messages. */
export function parseEnquiry(input: unknown): EnquiryInput {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const productId = typeof raw.productId === 'number' ? raw.productId : Number.NaN;
  if (!Number.isInteger(productId) || productId <= 0) errors.productId = 'A valid product is required';

  const name = text(raw.name);
  if (!name) errors.name = 'Name is required';
  else if (name.length > LIMITS.name) errors.name = `Name must be at most ${LIMITS.name} characters`;

  const email = text(raw.email);
  if (!email) errors.email = 'Email is required';
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';

  let phone: string | undefined;
  const rawPhone = text(raw.phone);
  if (rawPhone) {
    if (PHONE_RE.test(rawPhone)) phone = rawPhone;
    else errors.phone = 'Enter a valid phone number';
  }

  const message = text(raw.message);
  if (!message) errors.message = 'Message is required';
  else if (message.length > LIMITS.message) errors.message = `Message must be at most ${LIMITS.message} characters`;

  if (Object.keys(errors).length > 0) throw new ValidationError('Please check the highlighted fields', errors);

  const result: EnquiryInput = { productId, name, email, message };
  if (phone) result.phone = phone;
  return result;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.replace(CONTROL_CHARS, '').trim() : '';
}
