const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("vi-VN", {
  maximumFractionDigits: 0,
});

/** Format integer VND as "1.500.000 ₫". */
export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "0 ₫";
  }
  return vndFormatter.format(amount);
}

/** Format number with Vietnamese thousands separators, no currency symbol. */
export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return numberFormatter.format(n);
}

/** Parse Vietnamese-formatted number input (e.g. "1.500.000") back to integer. */
export function parseVND(input: string): number {
  if (!input) return 0;
  const cleaned = input.replace(/[^\d]/g, "");
  return cleaned ? parseInt(cleaned, 10) : 0;
}
