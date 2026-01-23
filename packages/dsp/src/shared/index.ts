// Export types
export * from './types'

// Export all DSP modules to register their factories
import '../module/clock/node'
import '../module/oscillator/node'
import '../module/filter/node'
import '../module/envelope/node'
import '../module/vca/node'
import '../module/mixer/node'
// import '../module/lfo/node' // TODO: LFO module needs implementation
import '../module/delay/node'
import '../module/noise/node'
import '../module/parameter/node'
import '../module/reverb/node'
import '../module/quantiser/node'
import '../module/euclidean/node'
