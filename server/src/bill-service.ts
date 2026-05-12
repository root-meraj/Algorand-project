import { nanoid } from 'nanoid';
import { createPaymentDraft, verifyPayment } from './algorand.js';
import { findBill, upsertBill } from './storage.js';
import { Bill, HistoryEntry, Participant } from './types.js';

const publicAppUrl = process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';

function now() {
  return new Date().toISOString();
}

function createHistoryEntry(type: string, message: string, txId?: string): HistoryEntry {
  return {
    id: nanoid(10),
    type,
    message,
    createdAt: now(),
    txId,
  };
}

function buildBillStatus(participants: Participant[]) {
  const paidCount = participants.filter((participant) => participant.status === 'paid').length;
  return {
    paidCount,
    totalParticipants: participants.length,
    status: paidCount === participants.length ? 'settled' : 'open',
  } as const;
}

export function createBill(payload: {
  title: string;
  description: string;
  organizerName: string;
  organizerAddress: string;
  totalAlgo: number;
  participants: Array<{ name: string; sharePercent: number }>;
}): Bill {
  const billId = nanoid(12);
  const joinCode = nanoid(8);
  const participants: Participant[] = payload.participants.map((participant) => ({
    id: nanoid(10),
    name: participant.name,
    sharePercent: participant.sharePercent,
    amountAlgo: Number(((payload.totalAlgo * participant.sharePercent) / 100).toFixed(6)),
    status: 'pending',
  }));

  const timestamp = now();
  const bill: Bill = {
    id: billId,
    title: payload.title,
    description: payload.description,
    organizerName: payload.organizerName,
    organizerAddress: payload.organizerAddress,
    settlementAddress: payload.organizerAddress,
    totalAlgo: payload.totalAlgo,
    joinCode,
    joinUrl: `${publicAppUrl}/?bill=${billId}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...buildBillStatus(participants),
    participants,
    history: [
      createHistoryEntry('bill-created', `Bill created by ${payload.organizerName}`),
      createHistoryEntry('link-generated', `Join link generated with code ${joinCode}`),
    ],
  };

  return upsertBill(bill);
}

export function getBillOrThrow(billId: string) {
  const bill = findBill(billId);
  if (!bill) {
    throw new Error('Bill not found');
  }

  return bill;
}

export function connectWalletToParticipant(billId: string, participantId: string, walletAddress: string) {
  const bill = getBillOrThrow(billId);
  const participant = bill.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new Error('Participant not found');
  }

  participant.walletAddress = walletAddress;
  participant.status = participant.status === 'paid' ? 'paid' : 'connected';
  participant.joinedAt ??= now();
  bill.updatedAt = now();
  bill.history.unshift(createHistoryEntry('wallet-connected', `${participant.name} connected a wallet`));

  return upsertBill({ ...bill, ...buildBillStatus(bill.participants) });
}

export async function createParticipantPaymentDraft(billId: string, participantId: string) {
  const bill = getBillOrThrow(billId);
  const participant = bill.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new Error('Participant not found');
  }

  if (!participant.walletAddress) {
    throw new Error('Participant wallet address is missing');
  }

  return createPaymentDraft({
    sender: participant.walletAddress,
    receiver: bill.settlementAddress,
    amountAlgo: participant.amountAlgo,
    note: `split-bill:${bill.id}:${participant.id}`,
  });
}

export function submitPaymentForParticipant(
  billId: string,
  participantId: string,
  txId: string,
  walletAddress: string,
) {
  const bill = getBillOrThrow(billId);
  const participant = bill.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new Error('Participant not found');
  }

  participant.walletAddress = walletAddress;
  participant.txId = txId;
  participant.status = 'submitted';
  participant.submittedAt = now();
  bill.updatedAt = now();
  bill.history.unshift(createHistoryEntry('payment-submitted', `${participant.name} submitted payment`, txId));

  return upsertBill({ ...bill, ...buildBillStatus(bill.participants) });
}

export async function refreshParticipantPayment(billId: string, participantId: string) {
  const bill = getBillOrThrow(billId);
  const participant = bill.participants.find((entry) => entry.id === participantId);

  if (!participant) {
    throw new Error('Participant not found');
  }

  if (!participant.txId) {
    return { bill, verified: false };
  }

  const verified = await verifyPayment({
    txId: participant.txId,
    expectedReceiver: bill.settlementAddress,
    expectedAmountAlgo: participant.amountAlgo,
    expectedSender: participant.walletAddress,
  }).catch(() => false);

  if (verified) {
    participant.status = 'paid';
    participant.paidAt = now();
    bill.updatedAt = now();
    bill.history.unshift(createHistoryEntry('payment-verified', `${participant.name} payment verified`, participant.txId));
  }

  const persisted = upsertBill({ ...bill, ...buildBillStatus(bill.participants) });
  return { bill: persisted, verified };
}
