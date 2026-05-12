import algosdk from 'algosdk';
const algodServer = process.env.ALGOD_SERVER ?? 'https://testnet-api.algonode.cloud';
const algodToken = process.env.ALGOD_TOKEN ?? '';
const algodPort = process.env.ALGOD_PORT ?? '';
const indexerServer = process.env.INDEXER_SERVER ?? 'https://testnet-idx.algonode.cloud';
const indexerToken = process.env.INDEXER_TOKEN ?? '';
const indexerPort = process.env.INDEXER_PORT ?? '';
function createAlgodClient() {
    return new algosdk.Algodv2(algodToken, algodServer, algodPort);
}
function createIndexerClient() {
    return new algosdk.Indexer(indexerToken, indexerServer, indexerPort);
}
export function toMicroAlgos(amountAlgo) {
    return Math.round(amountAlgo * 1_000_000);
}
export async function createPaymentDraft(payload) {
    const algodClient = createAlgodClient();
    const suggestedParams = await algodClient.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: payload.sender,
        receiver: payload.receiver,
        amount: toMicroAlgos(payload.amountAlgo),
        note: new TextEncoder().encode(payload.note),
        suggestedParams,
    });
    const encoded = Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString('base64');
    const paymentUri = `algorand://${payload.receiver}?amount=${toMicroAlgos(payload.amountAlgo)}&note=${encodeURIComponent(payload.note)}`;
    return {
        receiver: payload.receiver,
        amountAlgo: payload.amountAlgo,
        amountMicroAlgos: toMicroAlgos(payload.amountAlgo),
        note: payload.note,
        transaction: encoded,
        paymentUri,
    };
}
export async function verifyPayment(payload) {
    const indexerClient = createIndexerClient();
    const response = await indexerClient.lookupTransactionByID(payload.txId).do();
    const transaction = response.transaction;
    if (!transaction) {
        return false;
    }
    const payment = transaction.paymentTransaction;
    const sender = transaction.sender;
    const receiver = payment?.receiver;
    const amount = payment?.amount ?? 0;
    return (receiver === payload.expectedReceiver &&
        amount === toMicroAlgos(payload.expectedAmountAlgo) &&
        (!payload.expectedSender || sender === payload.expectedSender));
}
