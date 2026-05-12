import type { Bill, PaymentDraft } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export function createBill(payload: {
  title: string;
  description: string;
  organizerName: string;
  organizerAddress: string;
  totalAlgo: number;
  participants: Array<{ name: string; sharePercent: number }>;
}) {
  return request<{ bill: Bill }>('/bills', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchBill(billId: string) {
  return request<{ bill: Bill }>(`/bills/${billId}`);
}

export function connectParticipantWallet(
  billId: string,
  participantId: string,
  walletAddress: string,
) {
  return request<{ bill: Bill }>(`/bills/${billId}/participants/${participantId}/wallet`, {
    method: 'POST',
    body: JSON.stringify({ walletAddress }),
  });
}

export function preparePayment(billId: string, participantId: string) {
  return request<{ draft: PaymentDraft }>(`/bills/${billId}/participants/${participantId}/payment-draft`, {
    method: 'POST',
  });
}

export function submitPayment(
  billId: string,
  participantId: string,
  payload: { txId: string; walletAddress: string },
) {
  return request<{ bill: Bill }>(`/bills/${billId}/participants/${participantId}/submit-payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function refreshPaymentStatus(billId: string, participantId: string) {
  return request<{ bill: Bill; verified: boolean }>(
    `/bills/${billId}/participants/${participantId}/refresh-status`,
    { method: 'POST' },
  );
}
