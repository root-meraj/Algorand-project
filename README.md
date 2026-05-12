# Algorand Split Bill

Split-bill MVP built from the PRD in `split_bill_prd.pdf`.

## What is implemented

- Bill creation with percentage-based share allocation
- Unique join URL generation
- QR code fallback for in-person joining
- Wallet connection in the frontend using Pera Wallet
- Algorand payment draft generation on the backend
- Transaction submission from the frontend
- On-chain payment verification through an Algorand indexer
- Real-time settlement board and transaction history
- Clean integration seam for n8n notifications and reminders later

## Run locally

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:4000`.

## n8n integration point

When you are ready to connect n8n, use these backend events as triggers:

- `bill-created`
- `wallet-connected`
- `payment-submitted`
- `payment-verified`

Those events are persisted in `server/data/bills.json`, and the backend is already centralizing them in the bill history.
