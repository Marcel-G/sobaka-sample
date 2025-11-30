import { ModuleDSP, InputDefinition, OutputDefinition, ParamDefinition } from "./shared/types"
import { Link, Module, parsePlugId, PlugType } from "@sobaka/state";

/**
 * Creates a DSP instance for a given module
 * This should be implemented to instantiate the appropriate module type
 */
const createAudioModule = (module: Module, audioContext: AudioContext): ModuleDSP => {
  throw new Error('not implemented: createAudioModule for type ' + module.type)
}

/**
 * Audio graph reconciler - maintains the Web Audio graph based on state
 */
export class AudioGraph {
  private dspModules: Map<string, ModuleDSP> = new Map()
  private connections: Map<string, AudioNode | AudioParam> = new Map()

  constructor(private audioContext: AudioContext) {}

  /**
   * Reconcile the audio graph with the current state
   * Efficiently updates only what has changed
   */
  reconcile(modules: Module[], links: Required<Link>[]) {
    // Step 1: Add/update modules
    const moduleIds = new Set(modules.map(m => m.id))
    
    for (const module of modules) {
      if (!this.dspModules.has(module.id)) {
        // Create new DSP module
        const dsp = createAudioModule(module, this.audioContext)
        this.dspModules.set(module.id, dsp)
      }
    }

    // Step 2: Remove deleted modules
    for (const [id, dsp] of this.dspModules.entries()) {
      if (!moduleIds.has(id)) {
        dsp.destroy()
        this.dspModules.delete(id)
      }
    }

    // Step 3: Rebuild connections
    // Clear all existing connections
    this.disconnectAll()

    // Create new connections based on links
    for (const link of links) {
      try {
        this.connect(link)
      } catch (err) {
        console.warn('Failed to connect link:', link, err)
      }
    }
  }

  /**
   * Find an input definition by index
   */
  private findInput(dsp: ModuleDSP, index: number): InputDefinition | undefined {
    const routing = dsp.getRouting()
    return routing.inputs?.find(input => input.index === index)
  }

  /**
   * Find an output definition by index
   */
  private findOutput(dsp: ModuleDSP, index: number): OutputDefinition | undefined {
    const routing = dsp.getRouting()
    return routing.outputs?.find(output => output.index === index)
  }

  /**
   * Find a param definition by index
   */
  private findParam(dsp: ModuleDSP, index: number): ParamDefinition | undefined {
    const routing = dsp.getRouting()
    return routing.params?.find(param => param.index === index)
  }

  /**
   * Create a single connection based on a link
   */
  private connect(link: Required<Link>) {
    const from = parsePlugId(link.from)
    const to = parsePlugId(link.to)

    if (!from || !to) return

    // Handle mixer (destination) connections specially
    if (to.moduleId === 'global' && to.type === PlugType.Mixer) {
      const fromDSP = this.dspModules.get(from.moduleId)
      if (!fromDSP) return

      const output = this.findOutput(fromDSP, from.connectIndex)
      if (!output) {
        console.warn('Missing output for mixer link:', link)
        return
      }

      output.node.connect(this.audioContext.destination, output.connectIndex ?? 0)
      this.connections.set(link.id, this.audioContext.destination)
      return
    }

    const fromDSP = this.dspModules.get(from.moduleId)
    const toDSP = this.dspModules.get(to.moduleId)

    if (!fromDSP || !toDSP) return

    // Get source output
    if (from.type !== PlugType.Output) {
      console.warn('Source must be an output:', link)
      return
    }

    const output = this.findOutput(fromDSP, from.connectIndex)
    if (!output) {
      console.warn('Missing output definition:', link.from)
      return
    }

    // Connect based on destination type
    if (to.type === PlugType.Input) {
      // Audio output -> Audio input
      const input = this.findInput(toDSP, to.connectIndex)
      if (!input) {
        console.warn('Missing input definition:', link.to)
        return
      }

      output.node.connect(
        input.node,
        output.connectIndex ?? 0,
        input.connectIndex ?? 0
      )
      this.connections.set(link.id, input.node)

    } else if (to.type === PlugType.Param) {
      // Audio output -> Parameter (CV)
      const param = this.findParam(toDSP, to.connectIndex)
      if (!param) {
        console.warn('Missing param definition:', link.to)
        return
      }

      output.node.connect(param.param, output.connectIndex ?? 0)
      this.connections.set(link.id, param.param)
    }
  }

  /**
   * Disconnect all audio connections
   */
  private disconnectAll() {
    for (const dsp of this.dspModules.values()) {
      try {
        dsp.node.disconnect()
      } catch (err) {
        // Ignore errors from nodes that are already disconnected
      }
    }
    this.connections.clear()
  }

  /**
   * Get a specific input by plug ID
   */
  getInput(plugId: string): InputDefinition | undefined {
    const parsed = parsePlugId(plugId)
    const dsp = this.dspModules.get(parsed.moduleId)
    if (!dsp) return undefined
    return this.findInput(dsp, parsed.connectIndex)
  }

  /**
   * Get a specific output by plug ID
   */
  getOutput(plugId: string): OutputDefinition | undefined {
    const parsed = parsePlugId(plugId)
    const dsp = this.dspModules.get(parsed.moduleId)
    if (!dsp) return undefined
    return this.findOutput(dsp, parsed.connectIndex)
  }

  /**
   * Get a specific param by plug ID
   */
  getParam(plugId: string): ParamDefinition | undefined {
    const parsed = parsePlugId(plugId)
    const dsp = this.dspModules.get(parsed.moduleId)
    if (!dsp) return undefined
    return this.findParam(dsp, parsed.connectIndex)
  }

  /**
   * Get all routing for a module
   */
  getModuleRouting(moduleId: string) {
    const dsp = this.dspModules.get(moduleId)
    return dsp?.getRouting()
  }

  /**
   * Clean up all resources
   */
  destroy() {
    this.disconnectAll()
    for (const dsp of this.dspModules.values()) {
      dsp.destroy()
    }
    this.dspModules.clear()
  }
}
