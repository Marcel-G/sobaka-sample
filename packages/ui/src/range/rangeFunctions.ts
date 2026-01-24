/**
 * @group Helpers
 */

import { type ContinuousRange, type Range, RangeType, Scale } from './range'

/**
 * Converts `value` to a normalised value (ranging from 0 to 1) and returns it.
 * Returns 0 if value is undefined or invalid.
 */
export function toNormalised(range: Range, value: number | undefined | null): number {
  // Guard against undefined/null values
  if (value === undefined || value === null || !isValidNumber(value)) {
    return 0
  }
  
  switch (range.type) {
    case RangeType.Choice: {
      const index = range.choices.findIndex(c => c.value === value)
      if (index === -1 || range.choices.length <= 1) return 0
      return index / (range.choices.length - 1)
    }
    case RangeType.Continuous: {
      const interpolatedStart = interpolate(range, range.start)
      const interpolatedEnd = interpolate(range, range.end)
      if (range.bipolar) {
        const interpolatedValue =
          Math.sign(value) * interpolate(range, limitToStep(range, Math.abs(value)))
        return toRange(interpolatedValue, -interpolatedEnd, interpolatedEnd, 0, 1)
      }
      const interpolatedValue = interpolate(range, limitToStep(range, value))
      return toRange(interpolatedValue, interpolatedStart, interpolatedEnd, 0, 1)
    }
  }
}

/**
 * Converts a normalised `value` (ranging from 0 to 1) to it's natural range and returns it.
 * Returns the range start if value is undefined or invalid.
 */
export function fromNormalised(range: Range, normalisedValue: number | undefined | null): number {
  // Guard against undefined/null values
  if (normalisedValue === undefined || normalisedValue === null || !isValidNumber(normalisedValue)) {
    return getStart(range)
  }
  
  switch (range.type) {
    case RangeType.Continuous: {
      const interpolatedStart = interpolate(range, range.start)
      const interpolatedEnd = interpolate(range, range.end)
      if (range.bipolar) {
        const denormalisedValue = toRange(
          normalisedValue,
          0,
          1,
          -interpolatedEnd,
          interpolatedEnd
        )
        return limitToStep(
          range,
          Math.sign(denormalisedValue) *
            inverseInterpolate(range, Math.abs(denormalisedValue))
        )
      }
      const denormalisedValue = toRange(
        normalisedValue,
        0,
        1,
        interpolatedStart,
        interpolatedEnd
      )
      return limitToStep(range, inverseInterpolate(range, denormalisedValue))
    }
    case RangeType.Choice: {
      normalisedValue = limitValue(normalisedValue, 0, 1)
      if (range.choices.length === 0) return 0
      return range.choices[Math.round(normalisedValue * (range.choices.length - 1))].value
    }
  }
}

/**
 * Parses `value` from a value and a unit and returns the value as a number.
 * Returns the range start if parsing fails.
 */
export function fromString(range: Range, value: number | undefined | null, unit: string): number {
  // Guard against undefined/null/NaN values
  if (value === undefined || value === null || !isValidNumber(value)) {
    return getStart(range)
  }
  
  switch (range.type) {
    case RangeType.Choice: {
      unit = (unit || '').toLowerCase()
      return (
        range.choices.find(c => {
          const label = c.label.toLowerCase()
          let idx = -1
          for (let i = 0; i < unit.length; i++) {
            const newIdx = label.indexOf(unit[i])
            if (newIdx <= idx) {
              return false
            }
            idx = newIdx
          }
          return idx > -1
        })?.value ?? getStart(range)
      )
    }
    case RangeType.Continuous: {
      const result = range.stringToValue ? range.stringToValue(value, unit) : Number(value)
      // Ensure the result is valid
      return isValidNumber(result) ? result : getStart(range)
    }
  }
}

/**
 * Converts an unnormalised `value` to a user-friendly string representation.
 * Returns a fallback string if value is undefined or invalid.
 */
export function toString(range: Range, value: number | undefined | null): string {
  // Guard against undefined/null values
  if (value === undefined || value === null) {
    return '---'
  }
  
  // Guard against NaN/Infinity
  if (!isValidNumber(value)) {
    return '---'
  }
  
  switch (range.type) {
    case RangeType.Continuous: {
      return range.valueToString ? range.valueToString(value) : value.toFixed(1)
    }
    case RangeType.Choice: {
      return range.choices.find(d => d.value === value)?.label || '???'
    }
  }
}

/**
 * Snaps an unnormalised `value` to the closest legal value.
 */
export function snap(range: Range, value: number): number {
  switch (range.type) {
    case RangeType.Continuous: {
      value = toNormalised(range, value)
      if (Array.isArray(range.snap)) {
        for (const step of range.snap) {
          if (Math.abs(value - toNormalised(range, step)) <= (range.snapMargin || 0.025))
            return step
        }
      } else if (range.snap !== undefined) {
        return Math.round(fromNormalised(range, value) / range.snap) * range.snap
      }
      return fromNormalised(range, value)
    }
    case RangeType.Choice: {
      return value
    }
  }
}

/**
 * Returns a random un-normalised value.
 */
export function getRandom(range: Range): number {
  return fromNormalised(range, Math.random())
}

/**
 * Limits an un-normalised value to be within the range.
 * Returns the range start if the value is NaN or invalid.
 */
export function limit(range: Range, value: number): number {
  // Guard against NaN and Infinity
  if (!isValidNumber(value)) {
    return getStart(range)
  }
  
  switch (range.type) {
    case RangeType.Choice: {
      value = Math.round(value)
      if (range.choices.some(c => c.value === value)) {
        return value
      }
      return range.choices.length > 0 ? range.choices[0].value : -1
    }
    case RangeType.Continuous: {
      if (range.bipolar) {
        return limitValue(value, -range.end, range.end)
      }
      return limitValue(value, range.start, range.end)
    }
  }
}

/**
 * Nudges the un-normalised `value` by `steps`.
 */
export function nudge(range: Range, value: number, steps: number): number {
  switch (range.type) {
    case RangeType.Choice: {
      const index = limitValue(
        range.choices.findIndex(c => c.value === value) + steps,
        0,
        range.choices.length - 1
      )
      return range.choices[index].value
    }
    case RangeType.Continuous: {
      if (range.step) {
        return limitToStep(range, value + steps)
      }
      return fromNormalised(range, toNormalised(range, value) + steps * 0.01)
    }
  }
}

export function getStart(range: Range) {
  switch (range.type) {
    case RangeType.Choice: {
      if (range.choices.length === 0) {
        throw new Error(`Can't get the start value of an empty choice range.`)
      }
      return range.choices[0].value
    }
    case RangeType.Continuous: {
      return range.start
    }
  }
}

export function getEnd(range: Range) {
  switch (range.type) {
    case RangeType.Choice: {
      if (range.choices.length === 0) {
        throw new Error(`Can't get the end value of an empty choice range.`)
      }
      return range.choices[range.choices.length - 1].value
    }
    case RangeType.Continuous: {
      return range.end
    }
  }
}

/**
 * Minimum value for logarithmic calculations to prevent -Infinity
 */
const LOG_MIN = 1e-10

/**
 * Check if a value is a valid finite number
 */
export function isValidNumber(value: number): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Sanitize a value, returning a safe default if it's NaN or Infinity
 */
export function sanitizeValue(value: number, defaultValue: number): number {
  if (!isValidNumber(value)) {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.warn(`[Range] Invalid value detected: ${value}, using default: ${defaultValue}`)
    }
    return defaultValue
  }
  return value
}

function interpolate(range: ContinuousRange, value: number) {
  // Guard against invalid input
  if (!isValidNumber(value)) {
    return range.start
  }
  
  switch (range.scale?.type) {
    case Scale.Exponential:
      return Math.pow(Math.max(0, value), 1 / (range.scale.exp || 1))
    case Scale.Logarithmic:
      // Prevent log(0) = -Infinity and log(negative) = NaN
      return Math.log(Math.max(LOG_MIN, value))
  }
  return value
}

function inverseInterpolate(range: ContinuousRange, value: number) {
  // Guard against invalid input
  if (!isValidNumber(value)) {
    return range.start
  }
  
  switch (range.scale?.type) {
    case Scale.Exponential:
      return Math.pow(Math.max(0, value), range.scale.exp || 1)
    case Scale.Logarithmic:
      return Math.exp(value)
  }
  return value
}

function limitToStep(range: ContinuousRange, value: number) {
  if (range.step) {
    value = Math.round(value / range.step) * range.step
  }
  return limit(range, value)
}

/**
 * Clamps `value` to at least `min` and at most `max`.
 * Returns `min` if value is NaN.
 */
export function limitValue(value: number, min: number, max: number) {
  if (!isValidNumber(value)) {
    return min
  }
  return Math.min(Math.max(min, value), max)
}

/**
 * Converts `value` from the range `valueStart`...`valueEnd` to the range `targetStart`...`targetEnd`.
 */
function toRange(
  value: number,
  valueStart: number,
  valueEnd: number,
  targetStart: number,
  targetEnd: number
) {
  if (valueEnd === valueStart) {
    return targetStart
  }
  const normalised = (value - valueStart) / (valueEnd - valueStart)
  return limitValue(
    targetStart + normalised * (targetEnd - targetStart),
    targetStart,
    targetEnd
  )
}
