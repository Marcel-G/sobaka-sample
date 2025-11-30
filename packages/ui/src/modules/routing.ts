import type { ModuleRouting } from '@sobaka/dsp/shared/types'
import type { UIRouting, PlugDefinition } from './types'

/**
 * Convert DSP routing to simplified UI routing
 * Extracts only index and label for UI rendering
 */
export function toUIRouting(dspRouting: ModuleRouting): UIRouting {
  return {
    inputs: dspRouting.inputs?.map(({ index, label }) => ({ index, label })),
    outputs: dspRouting.outputs?.map(({ index, label }) => ({ index, label })),
    params: dspRouting.params?.map(({ index, label }) => ({ index, label }))
  }
}

/**
 * Create UI routing directly from simple definitions
 * Use this for defining routing metadata alongside module components
 */
export function routing(defs: {
  inputs?: Array<[number, string]>
  outputs?: Array<[number, string]>
  params?: Array<[number, string]>
}): UIRouting {
  return {
    inputs: defs.inputs?.map(([index, label]) => ({ index, label })),
    outputs: defs.outputs?.map(([index, label]) => ({ index, label })),
    params: defs.params?.map(([index, label]) => ({ index, label }))
  }
}
