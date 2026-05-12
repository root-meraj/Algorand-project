export type ParticipantStatus = 'pending' | 'connected' | 'submitted' | 'paid';

export type HistoryEntry = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  txId?: string;
};

export type Participant = {
  id: string;
  name: string;
  sharePercent: number;
  amountAlgo: number;
  walletAddress?: string;
  status: ParticipantStatus;
  txId?: string;
  joinedAt?: string;
  submittedAt?: string;
  paidAt?: string;
};

export type BillStatus = 'open' | 'settled';

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
  status: BillStatus;
  participants: Participant[];
  history: HistoryEntry[];
};
