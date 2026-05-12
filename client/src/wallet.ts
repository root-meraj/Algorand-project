type WalletModule = typeof import('@perawallet/connect');
type AlgoModule = typeof import('algosdk');

let peraWalletPromise: Promise<InstanceType<WalletModule['PeraWalletConnect']>> | null = null;

async function getPeraWallet() {
  if (!peraWalletPromise) {
    peraWalletPromise = import('@perawallet/connect').then(({ PeraWalletConnect }) => {
      return new PeraWalletConnect({ shouldShowSignTxnToast: false });
    });
  }

  return peraWalletPromise;
}

export async function reconnectWallet(): Promise<string | null> {
  const peraWallet = await getPeraWallet();
  const accounts = await peraWallet.reconnectSession();
  return accounts[0] ?? null;
}

export async function connectWallet(): Promise<string> {
  const peraWallet = await getPeraWallet();
  const accounts = await peraWallet.connect();
  return accounts[0];
}

export async function signAndSendTransaction(
  algodBaseServer: string,
  algodToken: string,
  algodPort: string,
  encodedTransaction: string,
): Promise<string> {
  const peraWallet = await getPeraWallet();
  const algosdk: AlgoModule['default'] = (await import('algosdk')).default;
  const txnBytes = Uint8Array.from(atob(encodedTransaction), (char) => char.charCodeAt(0));
  const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
  const signedTransactions = await peraWallet.signTransaction([[{ txn: decoded }]]);
  const algodClient = new algosdk.Algodv2(algodToken, algodBaseServer, algodPort);
  const { txid } = await algodClient.sendRawTransaction(signedTransactions).do();

  return txid;
}

export async function disconnectWallet() {
  const peraWallet = await getPeraWallet();
  await peraWallet.disconnect();
}
