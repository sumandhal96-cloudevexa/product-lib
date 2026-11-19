import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from '../api/client';
import { EnquiryForm } from './EnquiryForm';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return { ...actual, api: { ...actual.api, submitEnquiry: vi.fn() } };
});

const submitEnquiry = vi.mocked(api.submitEnquiry);

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Your name'), 'Ada Lovelace');
  await user.type(screen.getByLabelText('Email'), 'ada@example.com');
  await user.type(screen.getByLabelText('Message'), 'Is it in stock?');
  return user;
}

describe('EnquiryForm', () => {
  beforeEach(() => submitEnquiry.mockReset());

  it('shows a thank-you message after a successful submit and sends the product id', async () => {
    submitEnquiry.mockResolvedValue({ status: 'sent' });
    render(<EnquiryForm productId={7} productTitle="Cotton Jacket" />);

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
    expect(submitEnquiry).toHaveBeenCalledWith(expect.objectContaining({ productId: 7, email: 'ada@example.com' }));
  });

  it('blocks an empty submit and shows field errors without calling the API', async () => {
    render(<EnquiryForm productId={7} productTitle="Cotton Jacket" />);
    await userEvent.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(submitEnquiry).not.toHaveBeenCalled();
  });

  it('never shows thank-you when the server fails, and keeps what the user typed', async () => {
    submitEnquiry.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong'));
    render(<EnquiryForm productId={7} productTitle="Cotton Jacket" />);

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveValue('Ada Lovelace');
  });

  it('displays server-side field errors', async () => {
    submitEnquiry.mockRejectedValue(new ApiError(400, 'VALIDATION_ERROR', 'Please check', { phone: 'Enter a valid phone number' }));
    render(<EnquiryForm productId={7} productTitle="Cotton Jacket" />);

    const user = await fillValidForm();
    await user.click(screen.getByRole('button', { name: 'Send enquiry' }));

    expect(await screen.findByText('Enter a valid phone number')).toBeInTheDocument();
  });
});
