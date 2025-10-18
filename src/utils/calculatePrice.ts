// src/utils/calculatePrice.ts
export const calculateTotalPrice = (
  basePrice: number,
  tax: number,
  feePercentage: number = 3,
  fixedFee: number = 0.15
) => {
  const subtotal = basePrice + tax;
  const feeAmount = (subtotal * feePercentage) / 100 + fixedFee;
  return subtotal + feeAmount;
};
