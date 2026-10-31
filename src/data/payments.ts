/* Ways to pay and get paid. Kinds decide which details we ask for when adding one. */
export type PayKind = 'mobile' | 'card' | 'wallet' | 'bank';
export type PayMethod = { name: string; kind: PayKind; color: string; fg: string; tag: string; where?: string };

export const PAY_METHODS: PayMethod[] = [
  // Mobile money
  { name: 'MTN MoMo', kind: 'mobile', color: '#ffcc00', fg: '#000', tag: 'MTN', where: 'Cameroon, Ghana, Uganda, Rwanda, Côte d’Ivoire, Benin…' },
  { name: 'Orange Money', kind: 'mobile', color: '#ff7900', fg: '#000', tag: 'OM', where: 'Cameroon, Senegal, Mali, Côte d’Ivoire, Guinea…' },
  { name: 'Airtel Money', kind: 'mobile', color: '#e40000', fg: '#fff', tag: 'AM', where: 'Kenya, Uganda, Tanzania, Zambia, Malawi, Chad, Gabon…' },
  { name: 'M-Pesa', kind: 'mobile', color: '#4caf50', fg: '#fff', tag: 'MP', where: 'Kenya, Tanzania, DRC, Mozambique, Ghana…' },
  { name: 'Wave', kind: 'mobile', color: '#1dc4ff', fg: '#000', tag: 'W', where: 'Senegal, Côte d’Ivoire, Mali, Burkina Faso…' },
  { name: 'Moov Money', kind: 'mobile', color: '#0066b3', fg: '#fff', tag: 'MV', where: 'Benin, Togo, Côte d’Ivoire, Niger…' },
  { name: 'Express Union Mobile', kind: 'mobile', color: '#006837', fg: '#fff', tag: 'EU', where: 'Cameroon' },
  { name: 'Telecel Cash', kind: 'mobile', color: '#d7282f', fg: '#fff', tag: 'TC', where: 'Ghana' },
  { name: 'EcoCash', kind: 'mobile', color: '#0a5ea8', fg: '#fff', tag: 'EC', where: 'Zimbabwe' },
  { name: 'OPay', kind: 'mobile', color: '#1dcf9f', fg: '#000', tag: 'OP', where: 'Nigeria, Egypt' },
  // Cards
  { name: 'Visa', kind: 'card', color: '#1a1f71', fg: '#fff', tag: 'VISA' },
  { name: 'Mastercard', kind: 'card', color: '#eb001b', fg: '#fff', tag: 'MC' },
  { name: 'American Express', kind: 'card', color: '#2e77bc', fg: '#fff', tag: 'AMEX' },
  { name: 'Verve', kind: 'card', color: '#00425f', fg: '#fff', tag: 'VRV' },
  { name: 'UnionPay', kind: 'card', color: '#d10429', fg: '#fff', tag: 'UP' },
  { name: 'Mir', kind: 'card', color: '#0f754e', fg: '#fff', tag: 'MIR' },
  // Wallets
  { name: 'PayPal', kind: 'wallet', color: '#003087', fg: '#fff', tag: 'PP' },
  { name: 'Google Pay', kind: 'wallet', color: '#ffffff', fg: '#000', tag: 'G' },
  { name: 'Apple Pay', kind: 'wallet', color: '#000000', fg: '#fff', tag: '' },
  // Bank
  { name: 'Bank transfer', kind: 'bank', color: '#2a2a2e', fg: '#f6ee5c', tag: 'BANK' },
];
export const KIND_LABEL: Record<PayKind, string> = { mobile: 'Mobile money', card: 'Card', wallet: 'Wallet', bank: 'Bank' };
export const payOf = (name: string) => PAY_METHODS.find((m) => m.name === name) || PAY_METHODS[0];
