import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { connectWalletToParticipant, createBill, createParticipantPaymentDraft, getBillOrThrow, refreshParticipantPayment, submitPaymentForParticipant, } from './bill-service.js';
const app = express();
const port = Number(process.env.PORT ?? 4000);
const createBillSchema = z.object({
    title: z.string().min(3),
    description: z.string().min(3),
    organizerName: z.string().min(2),
    organizerAddress: z.string().min(32),
    totalAlgo: z.number().positive(),
    participants: z
        .array(z.object({
        name: z.string().min(1),
        sharePercent: z.number().min(0).max(100),
    }))
        .min(1),
});
const walletSchema = z.object({
    walletAddress: z.string().min(32),
});
const submitPaymentSchema = z.object({
    txId: z.string().min(10),
    walletAddress: z.string().min(32),
});
app.use(cors());
app.use(express.json());
app.get('/api/health', (_request, response) => {
    response.json({ ok: true });
});
app.post('/api/bills', (request, response) => {
    try {
        const payload = createBillSchema.parse(request.body);
        const shareTotal = payload.participants.reduce((sum, participant) => sum + participant.sharePercent, 0);
        if (Math.round(shareTotal * 100) / 100 !== 100) {
            response.status(400).json({ error: 'Participant shares must add up to 100%.' });
            return;
        }
        response.status(201).json({ bill: createBill(payload) });
    }
    catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Invalid payload' });
    }
});
app.get('/api/bills/:billId', (request, response) => {
    try {
        response.json({ bill: getBillOrThrow(request.params.billId) });
    }
    catch (error) {
        response.status(404).json({ error: error instanceof Error ? error.message : 'Bill not found' });
    }
});
app.post('/api/bills/:billId/participants/:participantId/wallet', (request, response) => {
    try {
        const payload = walletSchema.parse(request.body);
        response.json({
            bill: connectWalletToParticipant(request.params.billId, request.params.participantId, payload.walletAddress),
        });
    }
    catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
});
app.post('/api/bills/:billId/participants/:participantId/payment-draft', async (request, response) => {
    try {
        response.json({
            draft: await createParticipantPaymentDraft(request.params.billId, request.params.participantId),
        });
    }
    catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create draft' });
    }
});
app.post('/api/bills/:billId/participants/:participantId/submit-payment', (request, response) => {
    try {
        const payload = submitPaymentSchema.parse(request.body);
        response.json({
            bill: submitPaymentForParticipant(request.params.billId, request.params.participantId, payload.txId, payload.walletAddress),
        });
    }
    catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Failed to save payment' });
    }
});
app.post('/api/bills/:billId/participants/:participantId/refresh-status', async (request, response) => {
    try {
        response.json(await refreshParticipantPayment(request.params.billId, request.params.participantId));
    }
    catch (error) {
        response.status(400).json({ error: error instanceof Error ? error.message : 'Failed to refresh status' });
    }
});
app.listen(port, () => {
    console.log(`Split bill backend listening on http://localhost:${port}`);
});
