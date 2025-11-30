import { PlugType } from "@sobaka/state"

/**
 * Declarative definition of a module's audio input
 */
export interface InputDefinition {
  /** Index for this input (used in plug ID) */
  index: number
  /** Human-readable label */
  label: string
  /** The audio node to connect to */
  node: AudioNode
  /** Which input index on the audio node (default: 0) */
  connectIndex?: number
}

/**
 * Declarative definition of a module's audio output
 */
export interface OutputDefinition {
  /** Index for this output (used in plug ID) */
  index: number
  /** Human-readable label */
  label: string
  /** The audio node to connect from */
  node: AudioNode
  /** Which output index on the audio node (default: 0) */
  connectIndex?: number
}

/**
 * Declarative definition of a module's parameter (CV) input
 */
export interface ParamDefinition {
  /** Index for this param (used in plug ID) */
  index: number
  /** Human-readable label */
  label: string
  /** The audio parameter to modulate */
  param: AudioParam
}

/**
 * Complete declarative routing definition for a module
 */
export interface ModuleRouting {
  inputs?: InputDefinition[]
  outputs?: OutputDefinition[]
  params?: ParamDefinition[]
}

/**
 * Base interface for all module DSP instances
 * Each module type (Clock, Oscillator, etc.) implements this interface
 */
export interface ModuleDSP {
  /** Unique identifier matching the module in state */
  readonly id: string

  /** Primary audio node (for reference) */
  readonly node: AudioNode
  
  /** 
   * Declaratively define all routing for this module
   * This replaces the imperative getPlugContexts() method
   */
  getRouting(): ModuleRouting
  
  /** Clean up audio nodes and resources */
  destroy(): void
}

