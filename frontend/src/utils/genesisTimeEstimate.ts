export interface RemainingTimeEstimate {
  minSeconds: number
  maxSeconds: number
}

/** Estimate remaining sequential image-rendering time after observing real throughput. */
export function estimateRemainingImageTime(
  imageElapsedSeconds: number,
  completedFrames: number,
  totalFrames: number,
): RemainingTimeEstimate | null {
  if (
    !Number.isFinite(imageElapsedSeconds)
    || !Number.isFinite(completedFrames)
    || !Number.isFinite(totalFrames)
  ) return null
  if (imageElapsedSeconds < 10 || completedFrames < 2 || totalFrames <= completedFrames || totalFrames <= 0) {
    return null
  }

  const averageSecondsPerFrame = imageElapsedSeconds / completedFrames
  const projectedRemaining = averageSecondsPerFrame * (totalFrames - completedFrames)
  return {
    minSeconds: projectedRemaining * 0.6,
    maxSeconds: projectedRemaining * 2,
  }
}

export function formatElapsedTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return minutes > 0
    ? `${minutes}m ${String(remainder).padStart(2, '0')}s`
    : `${remainder}s`
}

export function formatRemainingTimeRange(estimate: RemainingTimeEstimate): string {
  if (estimate.maxSeconds < 60) return 'under 1 min'

  const minMinutes = Math.max(1, Math.floor(estimate.minSeconds / 60))
  const maxMinutes = Math.max(minMinutes, Math.ceil(estimate.maxSeconds / 60))
  return minMinutes === maxMinutes
    ? `about ${minMinutes} min`
    : `${minMinutes}–${maxMinutes} min`
}
