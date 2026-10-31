/* bolo wallet + escrow.
   Money for a job is taken from the client's wallet when the job is booked and held by bolo (escrow).
   It is released to the worker only when the client confirms the job is done, or refunded if the booking is cancelled.
   Until the payments backend is live (Phase 5) the money movements are simulated on the device. */
import { db, uid, Booking } from '../data/db';
import { toast } from '../ui/overlay';
import { bump, later } from './live';
import { P, nowT, xaf } from './core';

export type TxKind = 'topup' | 'hold' | 'release' | 'refund' | 'earn' | 'withdraw';
export type Tx = { id: string; kind: TxKind; amt: number; title: string; who?: string; booking?: string; method?: string; at: string; pending?: number };

export const MIN_TOPUP = 500;
export const MAX_TOPUP = 1_000_000;

export const wallet = () => db.WALLET;
export const balance = () => db.WALLET.bal;
const stamp = () => `Today, ${nowT()}`;
function addTx(t: Omit<Tx, 'id' | 'at'> & { at?: string }) {
  const tx: Tx = { id: uid('tx'), at: stamp(), ...t };
  db.WALLET.tx.unshift(tx);
  return tx;
}

/** "XAF 20,000", "XAF 15k", "XAF 18k – 25k" → the first amount in XAF. */
export function amtOf(price?: string) {
  const m = (price || '').replace(/\s/g, '').match(/(\d[\d,.]*)(k)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ''));
  return Math.round(m[2] ? n * 1000 : n);
}
export const bookingAmt = (b: Booking) => b.amt || amtOf(b.price);

/** Bookings you pay for whose money is still with bolo. */
export const escrowed = () => db.BOOKINGS.filter((b) => b.client === 'me' && (b.escrow === 'held' || b.escrow === 'unfunded'));
export const heldTotal = () => escrowed().filter((b) => b.escrow === 'held').reduce((n, b) => n + bookingAmt(b), 0);
/** Jobs you do where the client's money is secured. */
export const incoming = () => db.BOOKINGS.filter((b) => b.worker === 'me' && b.state !== 'confirmed');

/* ---------------- money in / out ---------------- */
/** Simulated approval from the payment provider, then the money lands in the wallet. */
export function topUp(amt: number, method: string, done?: () => void) {
  const tx = addTx({ kind: 'topup', amt, title: `Added from ${method}`, method, pending: 1 });
  bump();
  later(method.startsWith('Bank') ? 4500 : 2600, () => {
    tx.pending = 0;
    db.WALLET.bal += amt;
    bump();
    done?.();
  });
  return tx;
}
export function withdraw(amt: number, method: string) {
  if (amt <= 0 || amt > db.WALLET.bal) return false;
  db.WALLET.bal -= amt;
  const tx = addTx({ kind: 'withdraw', amt, title: `To ${method}`, method, pending: 1 });
  toast(`${xaf(amt)} is on its way to ${method}`);
  bump();
  later(5000, () => {
    tx.pending = 0;
    bump();
  });
  return true;
}

/* ---------------- escrow ---------------- */
/** Take the job's price from the wallet and hold it. Returns false when the balance is too low. */
export function holdFor(b: Booking) {
  const amt = bookingAmt(b);
  b.amt = amt;
  if (db.WALLET.bal < amt) {
    b.escrow = 'unfunded';
    return false;
  }
  db.WALLET.bal -= amt;
  b.escrow = 'held';
  addTx({ kind: 'hold', amt, title: b.title, who: b.worker, booking: b.id });
  return true;
}
/** Client confirmed: the held money goes to the worker. */
export function releaseFor(b: Booking) {
  if (b.escrow !== 'held') return;
  b.escrow = 'released';
  addTx({ kind: 'release', amt: bookingAmt(b), title: `Paid to ${P(b.worker).name}`, who: b.worker, booking: b.id });
}
/** Cancelled before the work started: money back to the wallet. */
export function refundFor(b: Booking) {
  if (b.escrow !== 'held') return;
  b.escrow = 'refunded';
  db.WALLET.bal += bookingAmt(b);
  addTx({ kind: 'refund', amt: bookingAmt(b), title: `Refund · ${b.title}`, who: b.worker, booking: b.id });
}
/** You did the job and the client confirmed: the money is yours. */
export function earnFor(b: Booking) {
  if (b.paidOut) return;
  b.paidOut = 1;
  const amt = bookingAmt(b);
  db.WALLET.bal += amt;
  addTx({ kind: 'earn', amt, title: b.title, who: b.client, booking: b.id });
}

/** Saves from before the wallet existed: open jobs count as already paid into escrow. */
export function ensureWallet() {
  db.BOOKINGS.forEach((b) => {
    if (!b.escrow && b.state !== 'confirmed') b.escrow = 'held';
    if (!b.amt) b.amt = amtOf(b.price);
  });
}

export const TX_LOOK: Record<TxKind, { icon: string; bg: string; fg: string; sign: '+' | '−' | ''; label: string }> = {
  topup: { icon: 'plus', bg: '#7be0a7', fg: '#000', sign: '+', label: 'Money added' },
  hold: { icon: 'lock', bg: '#a9b6ff', fg: '#000', sign: '−', label: 'Held in escrow' },
  release: { icon: 'checkc', bg: '#2a2a2e', fg: '#fff', sign: '', label: 'Released from escrow' },
  refund: { icon: 'back', bg: '#f6ee5c', fg: '#000', sign: '+', label: 'Refunded' },
  earn: { icon: 'coins', bg: '#7be0a7', fg: '#000', sign: '+', label: 'Earned' },
  withdraw: { icon: 'download', bg: '#f47b3b', fg: '#000', sign: '−', label: 'Withdrawn' },
};
