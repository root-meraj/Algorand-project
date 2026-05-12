export type ParticipantStatus = 'pending' | 'connected' | 'submitted' | 'paid';

export type Participant = {
  id: string;
  name: string;
  sharePercent: number;
  amountAlgo: number;
  walletAddress?: string;
  status: ParticipantStatus;
  txId?: string;
  paidAt?: string;
};

export type HistoryEntry = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  txId?: string;
};

export type Bill = {
  id: string;
  title: string;
  description: string;
  organizerName: string;
  organizerAddress: string;
  settlementAddress: string;
  totalAlgo: number;
  joinCode: string;
  joinUrl: string;
  createdAt: string;
  updatedAt: string;
  paidCount: number;
  totalParticipants: number;
  status: 'open' | 'settled';
  participants: Participant[];
  history: HistoryEntry[];
};

export type PaymentDraft = {
  receiver: string;
  amountAlgo: number;
  amountMicroAlgos: number;
  note: string;
  transaction: string;
  paymentUri: string;
};
