import { type ContinuousRange, type ChoiceRange, RangeType, Scale } from './range'

export const createVolumeRange = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  scale: {
    type: Scale.Exponential,
    exp: 1.5
  },
  stringToValue: (value: number, _unit: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    return Math.pow(10, value / 20)
  },
  valueToString: (value: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    if (value <= 0) {
      return '-inf'
    }
    if (value < 0.2) {
      return Math.round(20 * Math.log10(value)) + ' dB'
    }
    return (20 * Math.log10(value)).toFixed(1) + ' dB'
  }
})

/**
 * Creates a range for percentage values.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const createPercentageRange = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: value => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    return +value / 100
  },
  valueToString(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    return Math.round(value * 100) + '%'
  }
})

/**
 * Creates a range for percentages going from `-end` ... `end`.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const createBipolarPercentageRange = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  bipolar: true,
  stringToValue: value => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    return +value / 100
  },
  valueToString(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    return (value > 0 ? '+' : '') + Math.round(value * 100) + '%'
  }
})

/**
 * Creates a range that displays percentages with more accuracy.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const createAccuratePercentageRange = (
  start = 0,
  end = 1
): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: value => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    return +value / 100
  },
  valueToString: (value: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    const strValue = (value * 100).toFixed(1)
    if (strValue === '100.0') return '100%'
    return strValue + '%'
  }
})

/**
 * Creates a range whose value is either 0 or 1.
 *
 * @param offLabel The label for when the value is 0.
 * @param onLabel The label for when the value is 1.
 */
export const createToggleRange = (offLabel = 'Off', onLabel = 'On'): ChoiceRange => ({
  type: RangeType.Choice,
  choices: [
    { value: 0, label: offLabel },
    { value: 1, label: onLabel }
  ]
})

/**
 * Creates a range that displays time in ms.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const createTimeRange = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: (value, unit) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    if (unit === 's') {
      return value
    } else if (unit === 'ms') {
      return value / 1000
    }
    return value / 1000
  },
  valueToString: (value: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    const strValue = (value * 1000).toFixed(0)
    return strValue + 'ms'
  }
})

export const createScaleRange = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  step: 0.01
})

export const createBipolarScaleRange = (start = -1, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  bipolar: true,
  step: 0.01
})

const noteToVoltage = (note: string): number => {
  const octave = parseInt(note.slice(-1), 10)
  const noteName = note.slice(0, -1)
  const noteIndex = [
    'C',
    'C#',
    'D',
    'Eb',
    'E',
    'F',
    'F#',
    'G',
    'Ab',
    'A',
    'Bb',
    'B'
  ].indexOf(noteName.toUpperCase())
  if (isNaN(octave) || noteIndex === -1) return 0
  return octave + noteIndex / 12
}

export const createVoltPerOctaveRange = (start = 0, end = 8): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringMatcher: value => Boolean(value.match(/^[A-g]#?[0-9]+/g)),
  stringToValue: (value: number, unit: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    if (unit.match(/^[A-g]#?[0-9]+/g)) {
      return noteToVoltage(unit)
    } else if (unit === 'hz') {
      // Guard against log of zero or negative
      if (value <= 0) return start
      return Math.log2(value / 16.35)
    } else if (unit === 'khz') {
      if (value <= 0) return start
      return Math.log2((value * 1000) / 16.35)
    }

    return value
  }
})

export const createBpmRange = (start = 0, end = 320): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  step: 1,
  stringToValue: (value: number, unit: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    if (unit === 'hz') {
      if (value <= 0) return start
      return 60 / value
    }
    return value
  }
})

/**
 * Creates a range for LFO rate values in Hz.
 * Displays values < 1 Hz in mHz for readability.
 *
 * @param start The start value in Hz (default = 0.01).
 * @param end The end value in Hz (default = 30).
 */
export const createLfoRateRange = (start = 0.01, end = 30): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  scale: { type: Scale.Logarithmic },
  valueToString: (value: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '---'
    if (value < 1) {
      return `${(value * 1000).toFixed(0)} mHz`
    }
    return `${value.toFixed(2)} Hz`
  },
  stringToValue: (value: number, unit: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return start
    if (unit === 'mhz') {
      return value / 1000
    }
    return value
  }
})
