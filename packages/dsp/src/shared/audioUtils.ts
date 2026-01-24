/**
 * Audio utilities for safe parameter handling
 * 
 * These utilities help prevent NaN and Infinity values from
 * propagating through the audio graph, which can cause audio
 * to stop or produce no sound.
 */

/**
 * Check if a value is a valid finite number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Sanitize a value, returning a safe default if it's NaN or Infinity
 */
export function sanitizeValue(value: unknown, defaultValue: number): number {
  if (!isValidNumber(value)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[AudioUtils] Invalid value detected: ${value}, using default: ${defaultValue}`)
    }
    return defaultValue
  }
  return value
}

/**
 * Safely set an AudioParam value, guarding against NaN/Infinity
 * 
 * @param param The AudioParam to set
 * @param value The value to set (will be validated)
 * @param time The time at which to set the value
 * @param defaultValue Fallback value if the input is invalid
 */
export function safeSetValueAtTime(
  param: AudioParam | undefined,
  value: unknown,
  time: number,
  defaultValue: number
): void {
  if (!param) return
  
  const safeValue = sanitizeValue(value, defaultValue)
  
  try {
    param.setValueAtTime(safeValue, time)
  } catch (err) {
    console.error('[AudioUtils] Failed to set param value:', err)
  }
}

/**
 * Safely set an AudioParam with exponential ramp, guarding against invalid values
 * Note: exponentialRampToValueAtTime cannot go to/from zero
 * 
 * @param param The AudioParam to set
 * @param value The target value (will be validated and clamped)
 * @param time The time at which the ramp should complete
 * @param minValue Minimum valid value (must be > 0 for exponential ramp)
 */
export function safeExponentialRamp(
  param: AudioParam | undefined,
  value: unknown,
  time: number,
  minValue: number = 0.0001
): void {
  if (!param) return
  
  let safeValue = sanitizeValue(value, minValue)
  
  // exponentialRampToValueAtTime cannot handle zero or negative values
  if (safeValue <= 0) {
    safeValue = minValue
  }
  
  try {
    param.exponentialRampToValueAtTime(safeValue, time)
  } catch (err) {
    console.error('[AudioUtils] Failed to set exponential ramp:', err)
  }
}

/**
 * Safely set an AudioParam with linear ramp, guarding against invalid values
 * 
 * @param param The AudioParam to set
 * @param value The target value (will be validated)
 * @param time The time at which the ramp should complete
 * @param defaultValue Fallback value if the input is invalid
 */
export function safeLinearRamp(
  param: AudioParam | undefined,
  value: unknown,
  time: number,
  defaultValue: number
): void {
  if (!param) return
  
  const safeValue = sanitizeValue(value, defaultValue)
  
  try {
    param.linearRampToValueAtTime(safeValue, time)
  } catch (err) {
    console.error('[AudioUtils] Failed to set linear ramp:', err)
  }
}

/**
 * Safely set an AudioParam with setTargetAtTime, guarding against invalid values
 * 
 * @param param The AudioParam to set
 * @param value The target value (will be validated)
 * @param startTime When to start the exponential approach
 * @param timeConstant The time constant (larger = slower approach)
 * @param defaultValue Fallback value if the input is invalid
 */
export function safeSetTargetAtTime(
  param: AudioParam | undefined,
  value: unknown,
  startTime: number,
  timeConstant: number,
  defaultValue: number
): void {
  if (!param) return
  
  const safeValue = sanitizeValue(value, defaultValue)
  
  try {
    param.setTargetAtTime(safeValue, startTime, timeConstant)
  } catch (err) {
    console.error('[AudioUtils] Failed to setTargetAtTime:', err)
  }
}

/**
 * Clamp a value to a range, returning default if NaN
 */
export function safeClamp(value: unknown, min: number, max: number, defaultValue: number): number {
  if (!isValidNumber(value)) {
    return defaultValue
  }
  return Math.min(Math.max(min, value), max)
}

/**
 * Default fade duration in seconds
 * Short enough to be imperceptible but long enough to avoid clicks
 */
export const DEFAULT_FADE_DURATION = 0.015 // 15ms

/**
 * Create a fadeable output gain node wrapper
 * This provides smooth fade in/out to avoid audio pops when adding/removing modules
 * 
 * @param audioContext The audio context
 * @param startMuted If true, gain starts at 0 (for fade in), otherwise starts at 1
 * @returns Object with the gain node and fade methods
 */
export function createFadeableOutput(
  audioContext: AudioContext,
  startMuted: boolean = true
): {
  gainNode: GainNode
  fadeIn: (duration?: number) => Promise<void>
  fadeOut: (duration?: number) => Promise<void>
} {
  const gainNode = new GainNode(audioContext, { gain: startMuted ? 0 : 1 })
  
  const fadeIn = async (duration: number = DEFAULT_FADE_DURATION): Promise<void> => {
    const now = audioContext.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(1, now + duration)
    
    // Wait for the fade to complete
    await new Promise(resolve => setTimeout(resolve, duration * 1000))
  }
  
  const fadeOut = async (duration: number = DEFAULT_FADE_DURATION): Promise<void> => {
    const now = audioContext.currentTime
    gainNode.gain.cancelScheduledValues(now)
    gainNode.gain.setValueAtTime(gainNode.gain.value, now)
    gainNode.gain.linearRampToValueAtTime(0, now + duration)
    
    // Wait for the fade to complete
    await new Promise(resolve => setTimeout(resolve, duration * 1000))
  }
  
  return { gainNode, fadeIn, fadeOut }
}
