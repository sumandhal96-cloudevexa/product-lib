import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotFoundError, ValidationError } from '../src/domain/errors.ts';
import { silentLogger } from '../src/logger.ts';
import { EnquiryService } from '../src/services/enquiryService.ts';
import { LIMITS, parseEnquiry } from '../src/validation/enquiry.ts';
import { FakeMailer, InMemoryProvider, validEnquiry } from './fixtures.ts';

const fieldsOf = (input: unknown): string[] => {
  try {
    parseEnquiry(input);
  } catch (e) {
    assert.ok(e instanceof ValidationError);
    return Object.keys(e.fields ?? {});
  }
  return [];
};

describe('parseEnquiry', () => {
  it('accepts a valid enquiry and trims values', () => {
    const parsed = parseEnquiry({ ...validEnquiry, name: '  Ada  ' });
    assert.equal(parsed.name, 'Ada');
    assert.equal(parsed.productId, 2);
  });

  it('treats phone as optional', () => {
    const { phone: _phone, ...withoutPhone } = validEnquiry;
    assert.equal(parseEnquiry(withoutPhone).phone, undefined);
  });

  it('reports every invalid field at once', () => {
    assert.deepEqual(fieldsOf({}).sort(), ['email', 'message', 'name', 'productId']);
  });

  it('rejects bad emails, phones and product ids', () => {
    assert.deepEqual(fieldsOf({ ...validEnquiry, email: 'not-an-email' }), ['email']);
    assert.deepEqual(fieldsOf({ ...validEnquiry, phone: 'call me maybe' }), ['phone']);
    assert.deepEqual(fieldsOf({ ...validEnquiry, productId: '2' }), ['productId']);
    assert.deepEqual(fieldsOf({ ...validEnquiry, productId: -1 }), ['productId']);
  });

  it('enforces length limits', () => {
    assert.deepEqual(fieldsOf({ ...validEnquiry, message: 'x'.repeat(LIMITS.message + 1) }), ['message']);
    assert.deepEqual(fieldsOf({ ...validEnquiry, name: 'x'.repeat(LIMITS.name + 1) }), ['name']);
  });

  it('rejects non-string values rather than coercing them', () => {
    assert.deepEqual(fieldsOf({ ...validEnquiry, name: { $ne: '' } }), ['name']);
  });

  it('copes with a non-object body', () => {
    assert.ok(fieldsOf(null).length > 0);
    assert.ok(fieldsOf('hello').length > 0);
  });
});

describe('EnquiryService', () => {
  const setup = () => {
    const mailer = new FakeMailer();
    const service = new EnquiryService(
      new InMemoryProvider(),
      mailer,
      { salesInbox: 'sales@acme.test', from: 'catalogue@acme.test' },
      silentLogger,
    );
    return { mailer, service };
  };

  it('emails the sales inbox with product and customer details, replying to the customer', async () => {
    const { mailer, service } = setup();
    await service.submit(validEnquiry);

    assert.equal(mailer.sent.length, 1);
    const mail = mailer.sent[0]!;
    assert.equal(mail.to, 'sales@acme.test');
    assert.equal(mail.from, 'catalogue@acme.test');
    assert.equal(mail.replyTo, 'ada@example.com');
    assert.match(mail.subject, /Silver Necklace/);
    assert.match(mail.text, /Ada Lovelace/);
    assert.match(mail.text, /Is this available in gold\?/);
  });

  it('does not send anything when validation fails', async () => {
    const { mailer, service } = setup();
    await assert.rejects(service.submit({ ...validEnquiry, email: 'nope' }), ValidationError);
    assert.equal(mailer.sent.length, 0);
  });

  it('rejects an enquiry for a product that does not exist', async () => {
    const { mailer, service } = setup();
    await assert.rejects(service.submit({ ...validEnquiry, productId: 12345 }), NotFoundError);
    assert.equal(mailer.sent.length, 0);
  });

  it('propagates email failure so the customer is never told it succeeded', async () => {
    const { mailer, service } = setup();
    mailer.fail = true;
    await assert.rejects(service.submit(validEnquiry), /smtp down/);
  });

  it('cannot inject extra email headers through name or email', async () => {
    const { mailer, service } = setup();
    // The email regex forbids whitespace, so a newline in the address is rejected outright.
    await assert.rejects(
      service.submit({ ...validEnquiry, email: 'a@b.co\r\nBcc: attacker@evil.test' }),
      ValidationError,
    );
    // A newline in the name is flattened to one line before it reaches any header-bound field.
    await service.submit({ ...validEnquiry, name: 'Ada\r\nBcc: attacker@evil.test' });
    const mail = mailer.sent[0]!;
    assert.ok(!/[\r\n]/.test(mail.subject));
    assert.ok(!/[\r\n]/.test(mail.replyTo ?? ''));
    assert.ok(!/^Bcc:/m.test(mail.text));
  });
});
