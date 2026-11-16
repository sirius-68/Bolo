/* bolo wallet + escrow.
   Money for a job is taken from the client's wallet when the job is booked and held by bolo (escrow).
   It is released to the worker only when the client confirms the job is done, or refunded if the booking is cancelled.
   Until the payments backend is live (Phase 5) the money movements are simulated on the device. */
import { db, uid, Booking } from '../data/db';
import { toast } from '../ui/overlay';
import { bump, later } from './live';
import { nowT, xaf } from './core';
import { notify } from './notify';

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
    notify({ type: 'payment_in', cat: 'account', key: `tx:${tx.id}`, amount: xaf(amt), text: `${xaf(amt)} added to your wallet from ${method}.`, go: { k: 'wallet' } });
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
    notify({ type: 'payment', cat: 'account', key: `tx:${tx.id}`, amount: xaf(amt), text: `${xaf(amt)} was sent to ${method}.`, go: { k: 'wallet' } });
    bump();
  });
  return true;
}

/* ---------------- escrow ---------------- */

/* ---------------- escrow for services that aren't jobs (expert sessions) ---------------- */


export const TX_LOOK: Record<TxKind, { icon: string; bg: string; fg: string; sign: '+' | '−' | ''; label: string }> = {
  topup: { icon: 'plus', bg: '#7be0a7', fg: '#000', sign: '+', label: 'Money added' },
  hold: { icon: 'lock', bg: '#a9b6ff', fg: '#000', sign: '−', label: 'Held in escrow' },
  release: { icon: 'checkc', bg: '#2a2a2e', fg: '#fff', sign: '', label: 'Released from escrow' },
  refund: { icon: 'back', bg: '#f6ee5c', fg: '#000', sign: '+', label: 'Refunded' },
  earn: { icon: 'coins', bg: '#7be0a7', fg: '#000', sign: '+', label: 'Earned' },
  withdraw: { icon: 'download', bg: '#f47b3b', fg: '#000', sign: '−', label: 'Withdrawn' },
};
