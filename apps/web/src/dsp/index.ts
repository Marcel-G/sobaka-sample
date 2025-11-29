/**
 * DSP Layer Entry Point
 * 
 * Import all DSP module factories to ensure they are registered.
 * This file should be imported early in the application lifecycle.
 */

// Import all DSP modules to register their factories
import './modules/ClockDSP'
import './modules/OscillatorDSP'
import './modules/FilterDSP'
import './modules/VcaDSP'
import './modules/LfoDSP'
import './modules/DelayDSP'
import './modules/NoiseDSP'
import './modules/EnvelopeDSP'
import './modules/ParameterDSP'
import './modules/ReverbDSP'
import './modules/QuantiserDSP'
import './modules/SampleAndHoldDSP'

// Export main types and manager
export { ModuleDSPManager } from './ModuleDSPManager'
export type { ModuleDSP, ModuleDSPFactory } from './types'
export { DSP_FACTORIES, registerDSPFactory } from './types'
