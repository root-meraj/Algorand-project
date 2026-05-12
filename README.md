# 💸 Algorand Split Bill

> A decentralized bill-splitting app powered by the **Algorand blockchain**. Create a bill, share a link or QR code, and let everyone pay their share directly on-chain — no middlemen, no trust issues.

---

## ✨ Features

- 📋 **Bill Creation** — Create bills with percentage-based share allocation per participant
- 🔗 **Unique Join URLs** — Share a unique link so others can join and pay their share
- 📱 **QR Code Support** — Generate QR codes for easy in-person sharing
- 👛 **Pera Wallet Integration** — Seamless wallet connection via Pera Wallet
- ⛓️ **On-Chain Payments** — Algorand payment drafts generated on the backend and submitted from the frontend
- ✅ **Payment Verification** — Real-time on-chain verification via Algorand Indexer
- 📊 **Settlement Board** — Live dashboard showing who has paid and who hasn't
- 🔔 **n8n-Ready** — Clean integration seam for automated notifications and reminders

---

## 🏗️ Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Frontend  | React 19, TypeScript, Vite, Pera Wallet Connect |
| Backend   | Node.js, Express 5, TypeScript, tsx             |
| Blockchain| Algorand (TestNet), algosdk v3                  |
| Utilities | nanoid, zod, qrcode.react, cors                 |
| Dev Tools | concurrently, tsx watch                         |

---

## 📁 Project Structure

```
algorand-split-bill/
├── client/          # React + Vite frontend
│   ├── src/         # App source (components, pages, hooks)
│   └── public/      # Static assets
├── server/          # Express backend
│   └── src/         # API routes, Algorand logic, data layer
├── .env.example     # Environment variable template
└── package.json     # Root scripts (runs both client & server)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- A [Pera Wallet](https://perawallet.app/) account (for testing payments)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/algorand-split-bill.git
cd algorand-split-bill
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PUBLIC_APP_URL=http://localhost:5173
PORT=4000

# Algorand Node (AlgoNode public TestNet — no token needed)
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_TOKEN=
ALGOD_PORT=

# Algorand Indexer
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_TOKEN=
INDEXER_PORT=

# Frontend env vars (exposed via Vite)
VITE_API_BASE_URL=http://localhost:4000/api
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_TOKEN=
VITE_ALGOD_PORT=
```

> **Note:** AlgoNode's public TestNet endpoints work with empty tokens — no API key required for development.

### 3. Install Dependencies & Run

```bash
npm install
npm install --prefix server
npm install --prefix client
npm run dev
```

| Service    | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost:5173    |
| Backend    | http://localhost:4000    |

---

## 🔄 How It Works

1. **Create a Bill** — Set total amount and assign percentage shares to participants
2. **Share the Link** — Send the unique URL or QR code to each participant
3. **Connect Wallet** — Participants connect their Pera Wallet
4. **Pay On-Chain** — The backend generates an Algorand transaction; the frontend signs and submits it
5. **Verify & Settle** — The Indexer confirms the transaction; the settlement board updates in real-time

---

## 🔌 n8n Integration

When connecting n8n for automated notifications/reminders, hook into these backend events stored in `server/data/bills.json`:

| Event               | Trigger When...                        |
|---------------------|----------------------------------------|
| `bill-created`      | A new bill is created                  |
| `wallet-connected`  | A participant connects their wallet    |
| `payment-submitted` | A transaction is submitted on-chain    |
| `payment-verified`  | Payment is confirmed by the Indexer    |

---

## 📜 Available Scripts

| Command                        | Description                              |
|-------------------------------|------------------------------------------|
| `npm run dev`                  | Start both frontend and backend          |
| `npm run build`                | Build both client and server for prod    |
| `npm install --prefix client`  | Install frontend dependencies only      |
| `npm install --prefix server`  | Install backend dependencies only       |

---

## 🌐 Deployment

- **Frontend**: Deploy `client/dist` to Vercel, Netlify, or any static host
- **Backend**: Deploy `server` to Render, Railway, or Fly.io
- Update `VITE_API_BASE_URL` to point to your deployed backend URL

---

## 📄 License

ISC License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ on the Algorand blockchain</p>
