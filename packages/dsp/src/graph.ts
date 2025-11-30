import { derived, get } from "svelte/store";
import { ModuleDSP } from "./shared/types"
import { Link, Module, PlugType, Workspace } from "@sobaka/state";
import { ClockNode } from "./module/clock/node";

/**
 * Creates a DSP instance for a given module
 * This should be implemented to instantiate the appropriate module type
 */
const createAudioModule = (module: Module, audioContext: AudioContext): ModuleDSP => {
  if (module.type === 'Clock') return new ClockNode(module.id, audioContext, module.state as any)
  throw new Error('not implemented: createAudioModule for type ' + module.type)
}

/**
 * Audio graph reconciler - maintains the Web Audio graph based on state
 */
export class AudioGraph {
  private dspModules: Map<string, ModuleDSP> = new Map()
  private connections: Map<string, AudioNode> = new Map()

  constructor(private audioContext: AudioContext) {}

  /**
   * Reconcile the audio graph with the current state
   * Efficiently updates only what has changed
   */
  reconcile(modules: Module[], links: Required<Link>[]) {
    const moduleIds = new Set(modules.map(m => m.id))
    
    for (const module of modules) {
      if (!this.dspModules.has(module.id)) {
        // Create new DSP module
        const dsp = createAudioModule(module, this.audioContext)
        this.dspModules.set(module.id, dsp)
      }
    }

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
   * Create a single connection based on a link
   */
  private connect(link: Required<Link>) {
    if (this.connections.has(link.id)) return

    const { from, to } = link

    if (!from || !to) return

    const fromDSP = this.dspModules.get(from.moduleId)
    const fromRoute = fromDSP?.getRoute(from.routeName)

    const toDSP = this.dspModules.get(to.moduleId)
    const toRoute = toDSP?.getRoute(to.routeName)

    if (!fromRoute || !toRoute) return

    if (!(fromRoute.node instanceof AudioNode)) {
      throw new Error('TODO')
    }

    if ((toRoute.node instanceof AudioNode)) {
      fromRoute.node.connect(toRoute.node, fromRoute.connectIndex, toRoute.connectIndex)
    } else {
      fromRoute.node.connect(toRoute.node, fromRoute.connectIndex)
    }
    this.connections.set(link.id, fromRoute.node)
  }

  /**
   * Disconnect all audio connections
   */
  private disconnectAll() {
    for (const dsp of this.connections.values()) {
      dsp.disconnect()
    }
    this.connections.clear()
  }

  moduleNode(moduleId: string) {
    return this.dspModules.get(moduleId)
  }

  /**
   * Get the plug type for a given LinkPoint
   * Returns the PlugType from the module's routing definition
   */
  getPlugType(moduleId: string, routeName: string): PlugType | null {
    // Handle special global mixer
    if (moduleId === 'global' && routeName === 'mixer') {
      return PlugType.Mixer
    }

    const dsp = this.dspModules.get(moduleId)
    if (!dsp || !dsp.getRoutingDefinition) return null

    const routing = dsp.getRoutingDefinition()
    const route = routing[routeName]
    return route?.type ?? null
  }

  /**
   * Validate a link to ensure it connects output -> input/param/mixer
   */
  validateLink(from: { moduleId: string, routeName: string }, to: { moduleId: string, routeName: string }): boolean {
    const fromType = this.getPlugType(from.moduleId, from.routeName)
    const toType = this.getPlugType(to.moduleId, to.routeName)

    if (!fromType || !toType) return false

    // From must be output, to must be input/param/mixer
    return fromType === PlugType.Output && 
           [PlugType.Input, PlugType.Param, PlugType.Mixer].includes(toType)
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

export const createDsp = (ws: Workspace, audioContext: AudioContext) => {
  const graph = new AudioGraph(audioContext)

  derived([ws.modules, ws.links], ([$plugs, $links]) => [$plugs, $links] as const)
    .subscribe(([modules, links]) => graph.reconcile(modules, links))

  return graph
}
