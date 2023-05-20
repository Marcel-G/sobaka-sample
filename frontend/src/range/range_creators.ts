import { ContinuousRange, ChoiceRange, RangeType, Scale } from './range'

export const create_volume_range = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  scale: {
    type: Scale.Exponential,
    exp: 1.5
  },
  stringToValue: (value: number, unit: string) => {
    return Math.pow(10, value / 20)
  },
  valueToString: (value: number) => {
    if (value === 0) {
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
export const create_percentage_range = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: value => +value / 100,
  valueToString(value) {
    return Math.round(value * 100) + '%'
  }
})

/**
 * Creates a range for percentages going from `-end` ... `end`.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const create_bipolar_percentage_range = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  bipolar: true,
  stringToValue: value => +value / 100,
  valueToString(value) {
    return (value > 0 ? '+' : '') + Math.round(value * 100) + '%'
  }
})

/**
 * Creates a range that displays percentages with more accuracy.
 *
 * @param start The start value (default = 0).
 * @param end The end value (default = 1).
 */
export const create_accurate_percentage_range = (
  start = 0,
  end = 1
): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: value => +value / 100,
  valueToString: (value: number) => {
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
export const create_toggle_range = (offLabel = 'Off', onLabel = 'On'): ChoiceRange => ({
  type: RangeType.Choice,
  choices: [
    { value: 0, label: offLabel },
    { value: 1, label: onLabel }
  ]
})

/**
 * Creates a range that displays time in ms.
 *
 * @param offLabel The label for when the value is 0.
 * @param onLabel The label for when the value is 1.
 */
export const create_time_range = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: (value, unit) => {
    if (unit === 's') {
      return value
    } else if (unit === 'ms') {
      return value / 1000
    }
    return value / 1000
  },
  valueToString: (value: number) => {
    const strValue = (value * 1000).toFixed(0)
    return strValue + 'ms'
  }
})

export const create_scale_range = (start = 0, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  step: 0.01
})

export const create_bipolar_scale_range = (start = -1, end = 1): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  bipolar: true,
  step: 0.01
})

// @todo -- allow notes in volt per octave ranges
const note_to_voltage = (note: string): number => {
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
  ].indexOf(noteName)
  return octave + noteIndex / 12
}

export const create_volt_per_octave_range = (start = 0, end = 8): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  stringToValue: (value: number, unit: string) => {
    if (unit.toLowerCase() === 'hz') {
      return Math.log2(value / 16.35)
    } else if (unit.toLowerCase() === 'khz') {
      return Math.log2(value / 16384)
    }

    return value
  }
})

export const create_bpm_range = (start = 0, end = 320): ContinuousRange => ({
  type: RangeType.Continuous,
  start,
  end,
  step: 1,
  stringToValue: (value: number, unit: string) => {
    if (unit.toLowerCase() === 'hz') {
      return 60 / value
    }
    return value
  }
})
