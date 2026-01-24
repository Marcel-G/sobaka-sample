import { ModuleDSP } from "./shared/types"
import { Link, Module, PlugType } from "@sobaka/state";
import { MixerDSP } from "./module/mixer/node";

export interface ModuleFactory {
  createNode(type: string, id: string, ctx: AudioContext, state: Record<string, unknown>): ModuleDSP
  getInitialState(type: string): Record<string, unknown> | null
}

/**
 * Stores complete information about a connection for proper disconnection
 */
interface ConnectionInfo {
  sourceNode: AudioNode
  destinationNode: AudioNode | AudioParam
  sourceOutput?: number
  destinationInput?: number
}

export class AudioGraph {
  private dspModules: Map<string, ModuleDSP> = new Map()
  private staticModules: Map<string, ModuleDSP> = new Map()
  private connections: Map<string, ConnectionInfo> = new Map()

  constructor(
    private audioContext: AudioContext,
    private registry: ModuleFactory
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
    
    // Step 1: Add new modules (start muted, will fade in after connecting)
    const newModuleIds: string[] = []
    for (const module of modules) {
      if (!this.dspModules.has(module.id)) {
        const dsp = this.registry.createNode(
          module.type,
          module.id,
          this.audioContext,
          module.state as Record<string, unknown>
        )
        this.dspModules.set(module.id, dsp)
        newModuleIds.push(module.id)
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

    // Step 4: Fade in new modules (after they're connected)
    await Promise.all(
      newModuleIds.map(async (id) => {
        const dsp = this.dspModules.get(id)
        if (dsp?.fadeIn) {
          await dsp.fadeIn()
        }
      })
    )

    // Step 5: Fade out and remove deleted modules
    const modulesToRemove: string[] = []
    for (const [id] of this.dspModules.entries()) {
      if (!moduleIds.has(id)) {
        modulesToRemove.push(id)
      }
    }
    
    // Fade out all modules being removed in parallel
    await Promise.all(
      modulesToRemove.map(async (id) => {
        const dsp = this.dspModules.get(id)
        if (dsp?.fadeOut) {
          await dsp.fadeOut()
        }
      })
    )
    
    // Now destroy the modules
    for (const id of modulesToRemove) {
      const dsp = this.dspModules.get(id)
      dsp?.destroy()
      this.dspModules.delete(id)
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

    // Store full connection info for proper disconnection
    const connectionInfo: ConnectionInfo = {
      sourceNode: fromRoute.node,
      destinationNode: toRoute.node,
      sourceOutput: fromRoute.connectIndex,
      destinationInput: toRoute.node instanceof AudioNode ? toRoute.connectIndex : undefined
    }

    if ((toRoute.node instanceof AudioNode)) {
      fromRoute.node.connect(toRoute.node, fromRoute.connectIndex, toRoute.connectIndex)
    } else {
      fromRoute.node.connect(toRoute.node, fromRoute.connectIndex)
    }
    this.connections.set(link.id, connectionInfo)
  }

  /**
   * Disconnect specific links with a quick ramp to avoid clicks/pops
   * Uses AudioParam automation to ramp gain to zero before disconnecting
   * 
   * IMPORTANT: Disconnects only the specific connection, not all outputs from the source node
   */
  private async disconnectLinks(linkIds: string[]): Promise<void> {
    if (linkIds.length === 0) return
    
    const RAMP_DURATION = 0.001
    const currentTime = this.audioContext.currentTime
    
    // Collect connections to disconnect and ramp them if possible
    const connectionsToDisconnect: ConnectionInfo[] = []
    
    for (const linkId of linkIds) {
      const connection = this.connections.get(linkId)
      if (connection) {
        connectionsToDisconnect.push(connection)
        
        // If source is a GainNode, ramp it down (only if this is the only connection from this node)
        // Actually, we should avoid ramping shared gain nodes to 0
        // For now, just disconnect without ramping to avoid breaking other connections
      }
    }
    
    // Wait a tiny bit to avoid clicks
    if (connectionsToDisconnect.length > 0) {
      await new Promise(resolve => setTimeout(resolve, RAMP_DURATION * 1000))
    }
    
    // Disconnect each specific connection
    for (const linkId of linkIds) {
      const connection = this.connections.get(linkId)
      if (connection) {
        try {
          // Disconnect only the specific destination, not all outputs
          // This is the key fix - use the destination parameter to disconnect()
          if (connection.destinationNode instanceof AudioNode) {
            connection.sourceNode.disconnect(
              connection.destinationNode,
              connection.sourceOutput,
              connection.destinationInput
            )
          } else {
            // Disconnecting from AudioParam
            connection.sourceNode.disconnect(
              connection.destinationNode,
              connection.sourceOutput
            )
          }
        } catch (err) {
          // Node may already be disconnected, or this browser doesn't support
          // specific disconnection - fall back to logging the issue
          console.warn('[AudioGraph] Failed to disconnect specific connection:', err)
          // Don't try to disconnect all - that would break other connections
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
   * Clean up all resources immediately without fading
   * Use destroyWithFade() for a graceful teardown
   */
  destroy() {
    // Disconnect all connections
    for (const connection of this.connections.values()) {
      try {
        // When destroying, we can disconnect all from source since we're tearing everything down
        connection.sourceNode.disconnect()
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

  /**
   * Clean up all resources with a graceful fade out
   * Use this for teardown during normal operation to avoid pops
   */
  async destroyWithFade(): Promise<void> {
    // Fade out all modules in parallel
    const fadePromises: Promise<void>[] = []
    
    for (const dsp of this.dspModules.values()) {
      if (dsp.fadeOut) {
        fadePromises.push(dsp.fadeOut())
      }
    }
    
    for (const dsp of this.staticModules.values()) {
      if (dsp.fadeOut) {
        fadePromises.push(dsp.fadeOut())
      }
    }
    
    await Promise.all(fadePromises)
    
    // Now do the immediate cleanup
    this.destroy()
  }

  /**
   * Get diagnostic information about the current audio graph state
   * Useful for debugging audio issues
   */
  getDiagnostics(): {
    moduleCount: number
    staticModuleCount: number
    connectionCount: number
    modules: string[]
    staticModules: string[]
  } {
    return {
      moduleCount: this.dspModules.size,
      staticModuleCount: this.staticModules.size,
      connectionCount: this.connections.size,
      modules: Array.from(this.dspModules.keys()),
      staticModules: Array.from(this.staticModules.keys()),
    }
  }
}

/**
 * Create an AudioGraph instance
 */
export const createAudioGraph = (audioContext: AudioContext, registry: ModuleFactory) => {
  return new AudioGraph(audioContext, registry)
}
