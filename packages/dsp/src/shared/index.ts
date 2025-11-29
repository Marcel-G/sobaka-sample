// Export all DSP modules to register their factories
import '../module/clock/node'
import '../module/oscillator/node'
import '../module/filter/node'
import '../module/envelope/node'
import '../module/vca/node'
import '../module/lfo/node'
import '../module/delay/node'
import '../module/noise/node'
import '../module/parameter/node'
import '../module/reverb/node'
import '../module/quantiser/node'
import '../module/sample_and_hold/node'

export { INVENTORY, register } from './types'

// Re-export stub types for UI components
export type { OscillatorShape, Sequencer, StepSequencer, Point, PointBufferData, ScopeController } from './stubs'
