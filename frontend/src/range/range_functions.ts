/**
 * @group Helpers
 */

import { ContinuousRange, Range, RangeType, Scale } from './range'

/**
 * Converts `value` to a normalised value (ranging from 0 to 1) and returns it.
 */
export function to_normalised(range: Range, value: number): number {
  switch (range.type) {
    case RangeType.Choice:
      return range.choices.findIndex(c => c.value === value) / (range.choices.length - 1)
    case RangeType.Continuous: {
      const interpolatedStart = interpolate(range, range.start)
      const interpolatedEnd = interpolate(range, range.end)
      if (range.bipolar) {
        const interpolatedValue =
          Math.sign(value) * interpolate(range, limit_to_step(range, Math.abs(value)))
        return to_range(interpolatedValue, -interpolatedEnd, interpolatedEnd, 0, 1)
      }
      const interpolatedValue = interpolate(range, limit_to_step(range, value))
      return to_range(interpolatedValue, interpolatedStart, interpolatedEnd, 0, 1)
    }
  }
}

/**
 * Converts a normalised `value` (ranging from 0 to 1) to it's natural range and returns it.
 */
export function from_normalised(range: Range, normalisedValue: number): number {
  switch (range.type) {
    case RangeType.Continuous: {
      const interpolatedStart = interpolate(range, range.start)
      const interpolatedEnd = interpolate(range, range.end)
      if (range.bipolar) {
        const denormalisedValue = to_range(
          normalisedValue,
          0,
          1,
          -interpolatedEnd,
          interpolatedEnd
        )
        return limit_to_step(
          range,
          Math.sign(denormalisedValue) *
            inverse_interpolate(range, Math.abs(denormalisedValue))
        )
      }
      const denormalisedValue = to_range(
        normalisedValue,
        0,
        1,
        interpolatedStart,
        interpolatedEnd
      )
      return limit_to_step(range, inverse_interpolate(range, denormalisedValue))
    }
    case RangeType.Choice: {
      normalisedValue = limit_value(normalisedValue, 0, 1)
      return range.choices[Math.round(normalisedValue * (range.choices.length - 1))].value
    }
  }
}

/**
 * Parses `value` from a value and a unit and returns the value as a number.
 */
export function from_string(range: Range, value: number, unit: string): number {
  switch (range.type) {
    case RangeType.Choice: {
      unit = unit.toLowerCase()
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
        })?.value || 0
      )
    }
    case RangeType.Continuous: {
      return range.stringToValue ? range.stringToValue(value, unit) : Number(value)
    }
  }
}

/**
 * Converts an unnormalised `value` to a user-friendly string representation.
 */
export function to_string(range: Range, value: number): string {
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
      value = to_normalised(range, value)
      if (Array.isArray(range.snap)) {
        for (const step of range.snap) {
          if (Math.abs(value - to_normalised(range, step)) <= (range.snapMargin || 0.025))
            return step
        }
      } else if (range.snap !== undefined) {
        return Math.round(from_normalised(range, value) / range.snap) * range.snap
      }
      return from_normalised(range, value)
    }
    case RangeType.Choice: {
      return value
    }
  }
}

/**
 * Returns a random un-normalised value.
 */
export function get_random(range: Range): number {
  return from_normalised(range, Math.random())
}

/**
 * Limits an un-normalised value to be within the range.
 */
export function limit(range: Range, value: number): number {
  switch (range.type) {
    case RangeType.Choice: {
      value = Math.round(value)
      if (range.choices.some(c => c.value === value)) {
        return value
      }
      return -1
    }
    case RangeType.Continuous: {
      if (range.bipolar) {
        return limit_value(value, -range.end, range.end)
      }
      return limit_value(value, range.start, range.end)
    }
  }
}

/**
 * Nudges the un-normalised `value` by `steps`.
 */
export function nudge(range: Range, value: number, steps: number): number {
  switch (range.type) {
    case RangeType.Choice: {
      const index = limit_value(
        range.choices.findIndex(c => c.value === value) + steps,
        0,
        range.choices.length - 1
      )
      return range.choices[index].value
    }
    case RangeType.Continuous: {
      if (range.step) {
        return limit_to_step(range, value + steps)
      }
      return from_normalised(range, to_normalised(range, value) + steps * 0.01)
    }
  }
}

export function get_start(range: Range) {
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

export function get_end(range: Range) {
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

function interpolate(range: ContinuousRange, value: number) {
  switch (range.scale?.type) {
    case Scale.Exponential:
      return Math.pow(value, 1 / (range.scale.exp || 1))
    case Scale.Logarithmic:
      return Math.log(value)
  }
  return value
}

function inverse_interpolate(range: ContinuousRange, value: number) {
  switch (range.scale?.type) {
    case Scale.Exponential:
      return Math.pow(value, range.scale.exp || 1)
    case Scale.Logarithmic:
      return Math.exp(value)
  }
  return value
}

function limit_to_step(range: ContinuousRange, value: number) {
  if (range.step) {
    value = Math.round(value / range.step) * range.step
  }
  return limit(range, value)
}

/**
 * Clamps `value` to at least `min` and at most `max`.
 */
export function limit_value(value: number, min: number, max: number) {
  return Math.min(Math.max(min, value), max)
}

/**
 * Converts `value` from the range `valueStart`...`valueEnd` to the range `targetStart`...`targetEnd`.
 */
function to_range(
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
  return limit_value(
    targetStart + normalised * (targetEnd - targetStart),
    targetStart,
    targetEnd
  )
}
