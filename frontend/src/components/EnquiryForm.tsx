import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api } from '../api/client';

interface Props {
  productId: number;
  productTitle: string;
}

type FieldErrors = Record<string, string>;

export function EnquiryForm({ productId, productTitle }: Props) {
  const [values, setValues] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Quick feedback only; the server is the authority and returns the same field errors.
    const local: FieldErrors = {};
    if (!values.name.trim()) local.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) local.email = 'Enter a valid email address';
    if (!values.message.trim()) local.message = 'Message is required';
    setErrors(local);
    if (Object.keys(local).length > 0) return;

    setSubmitting(true);
    try {
      await api.submitEnquiry({
        productId,
        name: values.name,
        email: values.email,
        message: values.message,
        ...(values.phone.trim() ? { phone: values.phone } : {}),
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length > 0) setErrors(err.fields);
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="thanks">
        <h2>Thank you!</h2>
        <p>We have received your enquiry about {productTitle}. Our sales team will be in touch soon.</p>
      </div>
    );
  }

  const field = (id: keyof typeof values, label: string, props: Record<string, unknown> = {}) => (
    <div className="field">
      <label htmlFor={`enquiry-${id}`}>{label}</label>
      <input
        id={`enquiry-${id}`}
        value={values[id]}
        onChange={set(id)}
        aria-invalid={Boolean(errors[id])}
        aria-describedby={errors[id] ? `enquiry-${id}-error` : undefined}
        {...props}
      />
      {errors[id] && (
        <span id={`enquiry-${id}-error`} className="field__error">
          {errors[id]}
        </span>
      )}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="enquiry" aria-label="Product enquiry">
      <h2>Enquire about this product</h2>
      {field('name', 'Your name', { autoComplete: 'name', maxLength: 100 })}
      {field('email', 'Email', { type: 'email', autoComplete: 'email', maxLength: 254 })}
      {field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel', maxLength: 25 })}
      <div className="field">
        <label htmlFor="enquiry-message">Message</label>
        <textarea
          id="enquiry-message"
          rows={4}
          maxLength={2000}
          value={values.message}
          onChange={set('message')}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message && <span className="field__error">{errors.message}</span>}
      </div>
      {formError && (
        <p role="alert" className="status status--error">
          {formError}
        </p>
      )}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send enquiry'}
      </button>
    </form>
  );
}
