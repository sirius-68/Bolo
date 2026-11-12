/* Money switch. Real payments (mobile money, escrow, payouts, Pro, ads) need a payment provider and a legal
   check first (see the backend plan). Until then the wallet, escrow, Pro and ads are hidden, people agree the
   price in chat and pay each other directly, and every Pro feature is free. Flip this when payments go live. */
export const MONEY_LIVE = false;
