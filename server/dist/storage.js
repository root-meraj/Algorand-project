import fs from 'node:fs';
import path from 'node:path';
const dataDir = path.resolve(process.cwd(), 'data');
const dbFile = path.join(dataDir, 'bills.json');
function ensureDatabase() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dbFile)) {
        fs.writeFileSync(dbFile, JSON.stringify({ bills: [] }, null, 2));
    }
}
function readDatabase() {
    ensureDatabase();
    return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
}
function writeDatabase(database) {
    ensureDatabase();
    fs.writeFileSync(dbFile, JSON.stringify(database, null, 2));
}
export function findBill(billId) {
    return readDatabase().bills.find((bill) => bill.id === billId) ?? null;
}
export function upsertBill(bill) {
    const database = readDatabase();
    const index = database.bills.findIndex((entry) => entry.id === bill.id);
    if (index >= 0) {
        database.bills[index] = bill;
    }
    else {
        database.bills.push(bill);
    }
    writeDatabase(database);
    return bill;
}
