import { ModuleDSP } from "./shared/types"
import { Link, Module, PlugType } from "@sobaka/state";
import { MixerDSP } from "./module/mixer/node";
import { PluginRegistry } from "./plugin";

/**
 * Audio graph reconciler - maintains the Web Audio graph based on state
 */
export class AudioGraph {
  private dspModules: Map<string, ModuleDSP> = new Map()
  private staticModules: Map<string, ModuleDSP> = new Map()
  private connections: Map<string, AudioNode> = new Map()

  constructor(
    private audioContext: AudioContext,
    private registry: PluginRegistry
  ) {
    // Initialize static modules (always present, not in workspace state)
    this.initializeStaticModules()
  }

  /**
   * Initialize static modules that are always present
   * These are not synced to workspace state
   */
  private initializeStaticModules() {
    // Create the global output mixer
    const mixer = new MixerDSP('global-mixer', this.audioContext)
    this.staticModules.set('global-mixer', mixer)
  }

  /**
   * Reconcile the audio graph with the current state
   * Efficiently updates only what has changed
   */
  async reconcile(modules: Module[], links: Required<Link>[]) {
    const moduleIds = new Set(modules.map(m => m.id))
    const linkIds = new Set(links.map(l => l.id))
    
    // Step 1: Add new modules
    for (const module of modules) {
      if (!this.dspModules.has(module.id)) {
        const dsp = this.registry.createNode(
          module.type,
          module.id,
          this.audioContext,
          module.state as Record<string, unknown>
        )
        this.dspModules.set(module.id, dsp)
      }
    }

    // Step 2: Disconnect and remove deleted links (with fade)
    const removedLinkIds: string[] = []
    for (const [linkId] of this.connections.entries()) {
      if (!linkIds.has(linkId)) {
        removedLinkIds.push(linkId)
      }
    }
    
    if (removedLinkIds.length > 0) {
      await this.disconnectLinks(removedLinkIds)
    }

    // Step 3: Add new connections
    for (const link of links) {
      if (!this.connections.has(link.id)) {
        try {
          this.connect(link)
        } catch (err) {
          console.warn('Failed to connect link:', link, err)
        }
      }
    }

    // Step 4: Remove deleted modules (after disconnecting their links)
    for (const [id, dsp] of this.dspModules.entries()) {
      if (!moduleIds.has(id)) {
        dsp.destroy()
        this.dspModules.delete(id)
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

    const fromDSP = this.dspModules.get(from.moduleId) || this.staticModules.get(from.moduleId)
    const fromRoute = fromDSP?.getRoute(from.routeName)

    const toDSP = this.dspModules.get(to.moduleId) || this.staticModules.get(to.moduleId)
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
   * Disconnect specific links with a quick ramp to avoid clicks/pops
   * Uses AudioParam automation to ramp gain to zero before disconnecting
   */
  private async disconnectLinks(linkIds: string[]): Promise<void> {
    if (linkIds.length === 0) return
    
    const RAMP_DURATION = 0.001
    const currentTime = this.audioContext.currentTime
    
    // Collect the nodes we're about to disconnect and ramp them if possible
    const nodesToDisconnect: AudioNode[] = []
    
    for (const linkId of linkIds) {
      const sourceNode = this.connections.get(linkId)
      if (sourceNode) {
        nodesToDisconnect.push(sourceNode)
        
        // If it's a GainNode, ramp it down
        if (sourceNode instanceof GainNode) {
          sourceNode.gain.cancelScheduledValues(currentTime)
          sourceNode.gain.setValueAtTime(sourceNode.gain.value, currentTime)
          sourceNode.gain.linearRampToValueAtTime(0, currentTime + RAMP_DURATION)
        }
      }
    }
    
    // Wait for ramp duration
    if (nodesToDisconnect.length > 0) {
      await new Promise(resolve => setTimeout(resolve, RAMP_DURATION * 1000))
    }
    
    // Now disconnect only the specified links
    for (const linkId of linkIds) {
      const sourceNode = this.connections.get(linkId)
      if (sourceNode) {
        try {
          sourceNode.disconnect()
        } catch (err) {
          // Node may already be disconnected, ignore
        }
        this.connections.delete(linkId)
      }
    }
  }

  moduleNode(moduleId: string) {
    return this.dspModules.get(moduleId) || this.staticModules.get(moduleId)
  }

  /**
   * Get a static module (e.g., global mixer)
   */
  getStaticModule(moduleId: string): ModuleDSP | undefined {
    return this.staticModules.get(moduleId)
  }

  /**
   * Get all static module IDs
   */
  getStaticModuleIds(): string[] {
    return Array.from(this.staticModules.keys())
  }

  /**
   * Get the plug type for a given LinkPoint
   * Returns the PlugType from the module's routing definition
   */
  getPlugType(moduleId: string, routeName: string): PlugType | null {
    const dsp = this.dspModules.get(moduleId) || this.staticModules.get(moduleId)
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
   * Disconnects immediately without fade since we're tearing down
   */
  destroy() {
    for (const sourceNode of this.connections.values()) {
      try {
        sourceNode.disconnect()
      } catch (err) {
        // Node may already be disconnected, ignore
      }
    }
    this.connections.clear()
    
    for (const dsp of this.dspModules.values()) {
      dsp.destroy()
    }
    this.dspModules.clear()
    
    for (const dsp of this.staticModules.values()) {
      dsp.destroy()
    }
    this.staticModules.clear()
  }
}

/**
 * Create an AudioGraph instance
 */
export const createAudioGraph = (audioContext: AudioContext, registry: PluginRegistry) => {
  return new AudioGraph(audioContext, registry)
}
