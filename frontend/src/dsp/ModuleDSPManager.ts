import { derived, type Readable } from 'svelte/store'
import type { Module } from '../models/workspace'
import type { ModuleDSP } from './types'
import { DSP_FACTORIES } from './types'
import type { NodeContext, ParamContext } from '../context/plugs'

/**
 * ModuleDSPManager orchestrates all DSP nodes for a workspace
 * 
 * Responsibilities:
 * - Creates and destroys DSP instances as modules are added/removed from state
 * - Updates DSP parameters when module state changes
 * - Provides plug contexts for audio routing
 * - Manages lifecycle of all audio nodes
 */
export class ModuleDSPManager {
  private dspInstances = new Map<string, ModuleDSP>()
  private plugContextsStore = new Map<string, ParamContext | NodeContext>()
  
  constructor(
    private audioContext: AudioContext,
    private modules: Readable<Module[]>
  ) {
    // Subscribe to modules changes and manage DSP instances
    this.modules.subscribe(async modules => {
      await this.syncDSPInstances(modules)
    })
  }

  /**
   * Synchronize DSP instances with current module state
   */
  private async syncDSPInstances(modules: Module[]) {
    const moduleIds = new Set(modules.map(m => m.id))
    
    // Remove DSP instances for deleted modules
    for (const [id, dsp] of this.dspInstances) {
      if (!moduleIds.has(id)) {
        dsp.destroy()
        this.dspInstances.delete(id)
        
        // Remove plug contexts for this module
        for (const key of this.plugContextsStore.keys()) {
          if (key.startsWith(id + '/')) {
            this.plugContextsStore.delete(key)
          }
        }
      }
    }
    
    // Create or update DSP instances for current modules
    for (const module of modules) {
      const existingDSP = this.dspInstances.get(module.id)
      
      if (existingDSP) {
        // Update existing DSP with new state
        existingDSP.updateState(module.state)
      } else {
        // Create new DSP instance
        await this.createDSPInstance(module)
      }
    }
  }

  /**
   * Create a new DSP instance for a module
   */
  private async createDSPInstance(module: Module) {
    const factory = DSP_FACTORIES[module.type]
    
    if (!factory) {
      console.warn(`No DSP factory registered for module type: ${module.type}`)
      return
    }
    
    try {
      const dsp = await factory(module.id, this.audioContext, module.state)
      this.dspInstances.set(module.id, dsp)
      
      // Register plug contexts
      const plugContexts = dsp.getPlugContexts()
      for (const [plugId, context] of Object.entries(plugContexts)) {
        this.plugContextsStore.set(plugId, context)
      }
    } catch (error) {
      console.error(`Failed to create DSP instance for ${module.type}:`, error)
    }
  }

  /**
   * Get all current plug contexts for audio routing
   */
  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return Object.fromEntries(this.plugContextsStore)
  }

  /**
   * Get a readable store of plug contexts
   */
  getPlugContextsStore(): Readable<Record<string, ParamContext | NodeContext>> {
    // We'll need to make this reactive - for now return a derived store
    // that updates when modules change
    return derived(this.modules, () => this.getPlugContexts())
  }

  /**
   * Clean up all DSP instances
   */
  destroy() {
    for (const dsp of this.dspInstances.values()) {
      dsp.destroy()
    }
    this.dspInstances.clear()
    this.plugContextsStore.clear()
  }
}
