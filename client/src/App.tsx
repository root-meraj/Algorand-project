import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import algosdk from 'algosdk';
import {
  connectParticipantWallet,
  createBill,
  fetchBill,
  preparePayment,
  refreshPaymentStatus,
  submitPayment,
} from './api';
import type { Bill } from './types';
import { connectWallet, disconnectWallet, reconnectWallet, signAndSendTransaction } from './wallet';

const defaultParticipants = [
  { id: crypto.randomUUID(), name: 'Aarav', sharePercent: 40 },
  { id: crypto.randomUUID(), name: 'Nisha', sharePercent: 35 },
  { id: crypto.randomUUID(), name: 'Kabir', sharePercent: 25 },
];

const algodConfig = {
  server: import.meta.env.VITE_ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud',
  token: import.meta.env.VITE_ALGOD_TOKEN ?? '',
  port: import.meta.env.VITE_ALGOD_PORT ?? '',
};

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function App() {
  const [participants, setParticipants] = useState(defaultParticipants);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [selectedParticipantId, setSelectedParticipantId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [form, setForm] = useState({
    title: 'Goa getaway dinner',
    description: 'Pool a single dinner bill, then settle directly on Algorand.',
    organizerName: 'Meraj',
    organizerAddress: '',
    totalAlgo: 18.75,
  });

  const totalPercent = useMemo(
    () => participants.reduce((sum, participant) => sum + participant.sharePercent, 0),
    [participants],
  );

  const selectedParticipant = useMemo(
    () => bill?.participants.find((participant) => participant.id === selectedParticipantId) ?? null,
    [bill, selectedParticipantId],
  );

  useEffect(() => {
    reconnectWallet().then((address) => {
      if (address) {
        setWalletAddress(address);
      }
    });

    const billId = new URLSearchParams(window.location.search).get('bill');
    if (billId) {
      fetchBill(billId)
        .then(({ bill: responseBill }) => {
          setBill(responseBill);
          setSelectedParticipantId(responseBill.participants[0]?.id ?? '');
        })
        .catch((error: Error) => setFeedback(error.message));
    }
  }, []);

  async function handleCreateBill(event: FormEvent) {
    event.preventDefault();
    setFeedback('');

    if (totalPercent !== 100) {
      setFeedback('Participant shares must total exactly 100%.');
      return;
    }

    if (!algosdk.isValidAddress(form.organizerAddress)) {
      setFeedback('Enter a valid Algorand address for the settlement wallet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createBill({
        ...form,
        participants: participants.map(({ name, sharePercent }) => ({ name, sharePercent })),
      });
      setBill(response.bill);
      setSelectedParticipantId(response.bill.participants[0]?.id ?? '');
      window.history.replaceState({}, '', `/?bill=${response.bill.id}`);
      setFeedback('Bill created. Share the link or QR and start collecting on-chain payments.');
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConnectWallet() {
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      setFeedback(`Wallet connected: ${formatAddress(address)}`);

      if (bill && selectedParticipantId) {
        const response = await connectParticipantWallet(bill.id, selectedParticipantId, address);
        setBill(response.bill);
      }
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  async function handlePrepareAndPay() {
    if (!bill || !selectedParticipant) {
      return;
    }

    if (!walletAddress) {
      setFeedback('Connect a wallet before creating a payment request.');
      return;
    }

    setIsSubmitting(true);

    try {
      const walletResponse = await connectParticipantWallet(bill.id, selectedParticipant.id, walletAddress);
      setBill(walletResponse.bill);

      const { draft } = await preparePayment(bill.id, selectedParticipant.id);
      const txId = await signAndSendTransaction(
        algodConfig.server,
        algodConfig.token,
        algodConfig.port,
        draft.transaction,
      );

      const submitted = await submitPayment(bill.id, selectedParticipant.id, {
        txId,
        walletAddress,
      });
      setBill(submitted.bill);

      const refreshed = await refreshPaymentStatus(bill.id, selectedParticipant.id);
      setBill(refreshed.bill);
      setFeedback(
        refreshed.verified
          ? `Payment verified on-chain: ${txId}`
          : `Transaction submitted: ${txId}. Verification is still pending.`,
      );
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Algorand Split Bill Settlement</span>
          <h1>Fast group payments without the awkward follow-up.</h1>
          <p>
            Create a shared bill, split by percentage, share a live join link, and settle each share
            directly on-chain.
          </p>
          <div className="hero-metrics">
            <div>
              <strong>{bill?.totalParticipants ?? participants.length}</strong>
              <span>participants</span>
            </div>
            <div>
              <strong>{bill?.paidCount ?? 0}</strong>
              <span>paid</span>
            </div>
            <div>
              <strong>{bill?.totalAlgo ?? form.totalAlgo}</strong>
              <span>ALGO settled</span>
            </div>
          </div>
        </div>

        <div className="wallet-panel">
          <p className="wallet-title">WalletConnect entry</p>
          <h2>{walletAddress ? formatAddress(walletAddress) : 'Connect your Algorand wallet'}</h2>
          <p>
            Pera Wallet support is wired in. Once you connect, the selected participant can sign and
            submit their share from this page.
          </p>
          <div className="wallet-actions">
            <button type="button" className="primary" onClick={handleConnectWallet}>
              {walletAddress ? 'Reconnect wallet' : 'Connect wallet'}
            </button>
            {walletAddress ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  disconnectWallet().finally(() => setWalletAddress(null));
                }}
              >
                Disconnect
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <main className="grid">
        <section className="card create-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">MVP Flow</span>
              <h2>Create a bill</h2>
            </div>
            <span className={`pill ${totalPercent === 100 ? 'pill-ok' : 'pill-warn'}`}>
              {totalPercent}% allocated
            </span>
          </div>

          <form className="form" onSubmit={handleCreateBill}>
            <label>
              <span>Bill title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <div className="row">
              <label>
                <span>Organizer</span>
                <input
                  value={form.organizerName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, organizerName: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Total ALGO</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.totalAlgo}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, totalAlgo: Number(event.target.value) }))
                  }
                />
              </label>
            </div>

            <label>
              <span>Settlement wallet</span>
              <input
                placeholder="Algorand address receiving all participant payments"
                value={form.organizerAddress}
                onChange={(event) =>
                  setForm((current) => ({ ...current, organizerAddress: event.target.value.trim() }))
                }
              />
            </label>

            <div className="participants">
              {participants.map((participant) => (
                <div className="participant-row" key={participant.id}>
                  <input
                    value={participant.name}
                    onChange={(event) =>
                      setParticipants((current) =>
                        current.map((entry) =>
                          entry.id === participant.id ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={participant.sharePercent}
                    onChange={(event) =>
                      setParticipants((current) =>
                        current.map((entry) =>
                          entry.id === participant.id
                            ? { ...entry, sharePercent: Number(event.target.value) }
                            : entry,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="ghost icon-button"
                    onClick={() =>
                      setParticipants((current) =>
                        current.length > 1
                          ? current.filter((entry) => entry.id !== participant.id)
                          : current,
                      )
                    }
                  >
                    -
                  </button>
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  setParticipants((current) => [
                    ...current,
                    { id: crypto.randomUUID(), name: `Guest ${current.length + 1}`, sharePercent: 0 },
                  ])
                }
              >
                Add participant
              </button>
              <button type="submit" className="primary" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Create settlement'}
              </button>
            </div>
          </form>
        </section>

        <section className="card status-card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Live Status Board</span>
              <h2>{bill?.title ?? 'No bill loaded yet'}</h2>
            </div>
            {bill ? <span className="pill">{bill.status}</span> : null}
          </div>

          {bill ? (
            <>
              <div className="status-summary">
                <div className="summary-block">
                  <span>Join URL</span>
                  <strong>{bill.joinUrl}</strong>
                </div>
                <div className="summary-block">
                  <span>Settlement wallet</span>
                  <strong>{formatAddress(bill.settlementAddress)}</strong>
                </div>
              </div>

              <div className="board-layout">
                <div className="participant-list">
                  {bill.participants.map((participant) => (
                    <button
                      type="button"
                      key={participant.id}
                      className={`participant-card ${
                        participant.id === selectedParticipantId ? 'participant-card-active' : ''
                      }`}
                      onClick={() => setSelectedParticipantId(participant.id)}
                    >
                      <div>
                        <strong>{participant.name}</strong>
                        <span>{participant.sharePercent}% share</span>
                      </div>
                      <div className={`status-chip status-${participant.status}`}>{participant.status}</div>
                    </button>
                  ))}
                </div>

                <div className="detail-card">
                  {selectedParticipant ? (
                    <>
                      <div className="detail-header">
                        <div>
                          <span className="eyebrow">Selected participant</span>
                          <h3>{selectedParticipant.name}</h3>
                        </div>
                        <strong>{selectedParticipant.amountAlgo} ALGO</strong>
                      </div>

                      <div className="qr-panel">
                        <QRCodeSVG
                          value={bill.joinUrl}
                          size={150}
                          bgColor="transparent"
                          fgColor="#f6e7cb"
                        />
                        <div>
                          <p>Share this QR code in person for instant joining.</p>
                          <p>
                            Wallet:{' '}
                            {selectedParticipant.walletAddress
                              ? formatAddress(selectedParticipant.walletAddress)
                              : 'Not connected'}
                          </p>
                        </div>
                      </div>

                      <div className="detail-actions">
                        <button
                          type="button"
                          className="primary"
                          disabled={isSubmitting}
                          onClick={handlePrepareAndPay}
                        >
                          {isSubmitting ? 'Processing...' : 'Pay selected share'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={async () => {
                            const refreshed = await refreshPaymentStatus(bill.id, selectedParticipant.id);
                            setBill(refreshed.bill);
                            setFeedback(
                              refreshed.verified
                                ? 'The payment is confirmed on Algorand.'
                                : 'No confirmed on-chain payment found yet.',
                            );
                          }}
                        >
                          Refresh status
                        </button>
                      </div>
                    </>
                  ) : (
                    <p>Select a participant to manage their payment request.</p>
                  )}
                </div>
              </div>

              <div className="history">
                <span className="eyebrow">Transaction history</span>
                {bill.history.map((entry) => (
                  <div className="history-row" key={entry.id}>
                    <div>
                      <strong>{entry.message}</strong>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    {entry.txId ? <code>{entry.txId}</code> : <span className="pill">{entry.type}</span>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-copy">
              Create a bill to unlock the join link, QR sharing, payment request generation, and live
              settlement board.
            </p>
          )}
        </section>
      </main>

      {feedback ? <div className="toast">{feedback}</div> : null}
    </div>
  );
}

export default App;
