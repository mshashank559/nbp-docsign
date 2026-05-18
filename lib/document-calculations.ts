export function getAmountToBePaid(fields: Record<string, string>) {
  return readAmount(fields.packAmount) - readAmount(fields.discountAmount)
}

export function readAmount(value?: string) {
  const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(amount) ? amount : 0
}
