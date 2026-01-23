/**
 * DSP Package Entry Point
 * 
 * Exports module definitions, registry, and node classes.
 * App is responsible for creating registry and registering modules.
 */

// Core types and utilities
export * from './shared'
export * from './graph'

// Registry system
export { ModuleRegistry, type ModuleDefinition, type ModuleCategory } from './registry'

// Module definitions (app registers these)
export * from './definitions'

// Node classes (for type references)
export * from './module/clock/node'
export * from './module/mixer/node'
export * from './module/oscillator/node'
export * from './module/noise/node'
export * from './module/filter/node'
export * from './module/envelope/node'
export * from './module/delay/node'
export * from './module/reverb/node'
export * from './module/quantiser/node'
export * from './module/parameter/node'
export * from './module/vca/node'
export * from './module/scope/node'
export * from './module/lfo/node'
export * from './module/euclidean/node'

// Legacy exports (deprecated - use registry instead)
export { createAudioModuleInitialState } from './module'
