// The Register's cart: what is being sold before record_sale runs. Money is whole cents here so the
// totals on screen are the ones record_sale computes (20260930110000_sales.sql §2): each line rounded,
// and the tax inside it rounded per line, total × rate / (100 + rate). The server's figures are the ones
// kept; these only have to agree with them.

export type CartLine = { productId: string; name: string; price: number; taxRate: number; qty: number };

export type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'qty'> }
  | { type: 'set'; productId: string; qty: number }
  | { type: 'clear' };

export function cartReducer(lines: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add':
      return lines.some((line) => line.productId === action.line.productId)
        ? lines.map((line) => (line.productId === action.line.productId ? { ...line, qty: line.qty + 1 } : line))
        : [...lines, { ...action.line, qty: 1 }];
    case 'set':
      // Stepping below one removes the line.
      return action.qty < 1
        ? lines.filter((line) => line.productId !== action.productId)
        : lines.map((line) => (line.productId === action.productId ? { ...line, qty: action.qty } : line));
    case 'clear':
      return [];
  }
}

const cents = (amount: number) => Math.round(amount * 100);

export function lineTotal(line: CartLine): number {
  return (cents(line.price) * line.qty) / 100;
}

/** The sale's total, the tax already inside it, and how many units are in the cart. */
export function cartTotals(lines: CartLine[]) {
  let total = 0;
  let tax = 0;
  let count = 0;
  for (const line of lines) {
    const amount = cents(line.price) * line.qty;
    total += amount;
    tax += Math.round((amount * line.taxRate) / (100 + line.taxRate));
    count += line.qty;
  }
  return { total: total / 100, tax: tax / 100, count };
}

if (__DEV__) {
  const check = cartTotals([
    { productId: 'a', name: 'a', price: 1.1, taxRate: 12, qty: 3 },
    { productId: 'b', name: 'b', price: 50, taxRate: 0, qty: 1 },
  ]);
  // 3.30 incl. 12% tax is 0.3536 → 0.35; 50.00 at 0% carries none.
  if (check.total !== 53.3 || check.tax !== 0.35 || check.count !== 4) throw new Error('cartTotals is wrong');
}
