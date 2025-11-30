import type { ModuleRouting, InputDefinition, OutputDefinition, ParamDefinition } from './types'

/**
 * Fluent builder for creating module routing definitions
 * Makes it easier to construct routing with a chainable API
 */
export class RoutingBuilder {
  private routing: ModuleRouting = {}

  /**
   * Add an audio input
   */
  input(index: number, label: string, node: AudioNode, connectIndex = 0): this {
    if (!this.routing.inputs) {
      this.routing.inputs = []
    }
    this.routing.inputs.push({ index, label, node, connectIndex })
    return this
  }

  /**
   * Add an audio output
   */
  output(index: number, label: string, node: AudioNode, connectIndex = 0): this {
    if (!this.routing.outputs) {
      this.routing.outputs = []
    }
    this.routing.outputs.push({ index, label, node, connectIndex })
    return this
  }

  /**
   * Add a parameter (CV) input
   */
  param(index: number, label: string, param: AudioParam): this {
    if (!this.routing.params) {
      this.routing.params = []
    }
    this.routing.params.push({ index, label, param })
    return this
  }

  /**
   * Add multiple inputs at once
   */
  inputs(inputs: InputDefinition[]): this {
    if (!this.routing.inputs) {
      this.routing.inputs = []
    }
    this.routing.inputs.push(...inputs)
    return this
  }

  /**
   * Add multiple outputs at once
   */
  outputs(outputs: OutputDefinition[]): this {
    if (!this.routing.outputs) {
      this.routing.outputs = []
    }
    this.routing.outputs.push(...outputs)
    return this
  }

  /**
   * Add multiple params at once
   */
  params(params: ParamDefinition[]): this {
    if (!this.routing.params) {
      this.routing.params = []
    }
    this.routing.params.push(...params)
    return this
  }

  /**
   * Build the final routing object
   */
  build(): ModuleRouting {
    return this.routing
  }
}

/**
 * Helper to create a routing builder
 * @example
 * ```ts
 * routing()
 *   .input(0, 'Signal', myNode)
 *   .param(0, 'Frequency', myParam)
 *   .output(0, 'Out', myNode)
 *   .build()
 * ```
 */
export function routing(): RoutingBuilder {
  return new RoutingBuilder()
}
