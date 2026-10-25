export const PREMIUM_IMAGE_OUTPUT_PRICE_USD = 0.0336

/** Approximate standard output charge only; prompt and reference-image input costs are excluded. */
export function estimatePremiumRenderOutputCost(frameCount: number): number {
  if (!Number.isFinite(frameCount) || frameCount <= 0) return 0
  return frameCount * PREMIUM_IMAGE_OUTPUT_PRICE_USD
}

export function formatPremiumRenderOutputEstimate(frameCount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(estimatePremiumRenderOutputCost(frameCount))
}
