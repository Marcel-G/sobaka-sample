import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { EuclideanNode as _EuclideanNode, StepEvent } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export const MAX_STEPS = 16;

export interface EuclideanState {
  steps: number
  fills: number
  rotation: number
}

const INITIAL_STATE: EuclideanState = {
  steps: 8,
  fills: 3,
  rotation: 0,
}

export interface StepEventData {
  step: number
  triggered: boolean
}

/**
 * Bjorklund's algorithm for computing Euclidean rhythms
 * Must match the Rust implementation exactly
 */
export function computeEuclideanPattern(steps: number, fills: number, rotation: number): boolean[] {
  if (steps === 0 || fills === 0) {
    return Array(steps).fill(false)
  }
  
  fills = Math.min(fills, steps)
  
  // Bjorklund's algorithm
  const counts: number[] = Array(steps).fill(0)
  const remainders: number[] = Array(steps).fill(0)
  
  let divisor = steps - fills
  remainders[0] = fills
  let level = 0
  
  while (remainders[level] > 1) {
    counts[level] = Math.floor(divisor / remainders[level])
    remainders[level + 1] = divisor % remainders[level]
    divisor = remainders[level]
    level++
  }
  counts[level] = divisor
  
  // Build the pattern recursively
  const result: boolean[] = []
  
  function build(lvl: number): void {
    if (lvl === -1) {
      result.push(false)
    } else if (lvl === -2) {
      result.push(true)
    } else {
      for (let i = 0; i < counts[lvl]; i++) {
        build(lvl - 1)
      }
      if (remainders[lvl] !== 0) {
        build(lvl - 2)
      }
    }
  }
  
  build(level)
  
  // Apply rotation
  const pattern: boolean[] = []
  for (let i = 0; i < steps; i++) {
    const rotatedIdx = (i + rotation) % steps
    pattern.push(result[rotatedIdx] ?? false)
  }
  
  return pattern
}

/**
 * DSP implementation for Euclidean rhythm sequencer
 * Generates trigger patterns using the Euclidean algorithm
 */
export class EuclideanNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "euclidean"
  private euclidean?: _EuclideanNode
  private stepsParam?: AudioParam
  private fillsParam?: AudioParam
  private rotationParam?: AudioParam
  public state: EuclideanState
  private cleanupHandler: (() => void) | null = null
  private stepListeners: Set<(event: StepEventData) => void> = new Set()
  private pollingInterval?: number

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: EuclideanState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.euclidean = new _EuclideanNode(audioContext)
      
      // Get parameter references
      this.stepsParam = this.euclidean.node.parameters.get('steps')!
      this.fillsParam = this.euclidean.node.parameters.get('fills')!
      this.rotationParam = this.euclidean.node.parameters.get('rotation')!
      
      // Initialize parameters from state
      this.syncParams()

      // Observe Yjs state changes
      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }

      // Start polling for step events
      this.startEventPolling()
    }
  }

  private startEventPolling() {
    const poll = () => {
      if (!this.euclidean) return
      
      // Drain all pending events, keep the latest
      let latestEvent: StepEvent | undefined
      let event: StepEvent | undefined
      while ((event = this.euclidean.pollEvent())) {
        latestEvent = event
      }
      
      if (latestEvent !== undefined) {
        const eventData: StepEventData = {
          step: latestEvent.step,
          triggered: latestEvent.triggered,
        }
        this.stepListeners.forEach(listener => listener(eventData))
      }
      
      this.pollingInterval = requestAnimationFrame(poll)
    }
    
    this.pollingInterval = requestAnimationFrame(poll)
  }

  /**
   * Add a listener for step events
   */
  public addStepListener(listener: (event: StepEventData) => void) {
    this.stepListeners.add(listener)
  }

  /**
   * Remove a step listener
   */
  public removeStepListener(listener: (event: StepEventData) => void) {
    this.stepListeners.delete(listener)
  }

  private syncParams() {
    const now = this.audioContext.currentTime
    this.stepsParam?.setValueAtTime(this.state.steps, now)
    this.fillsParam?.setValueAtTime(Math.min(this.state.fills, this.state.steps), now)
    this.rotationParam?.setValueAtTime(this.state.rotation % this.state.steps, now)
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.euclidean) return
    
    const now = this.audioContext.currentTime
    
    if (event.keysChanged.has('steps')) {
      const steps = event.target.get('steps')
      this.stepsParam?.setValueAtTime(steps, now)
    }
    if (event.keysChanged.has('fills')) {
      const fills = Math.min(event.target.get('fills'), this.state.steps)
      this.fillsParam?.setValueAtTime(fills, now)
    }
    if (event.keysChanged.has('rotation')) {
      const rotation = event.target.get('rotation') % this.state.steps
      this.rotationParam?.setValueAtTime(rotation, now)
    }
  }

  /**
   * Get the current pattern based on state
   * Uses the same algorithm as the DSP for consistency
   */
  getPattern(): boolean[] {
    return computeEuclideanPattern(this.state.steps, this.state.fills, this.state.rotation)
  }

  getRoutingDefinition() {
    return {
      clock: { name: "clock", type: PlugType.Input, label: 'CLK' },
      reset: { name: "reset", type: PlugType.Input, label: 'RST' },
      output: { name: "output", type: PlugType.Output, label: 'OUT' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.euclidean) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "clock":
        return { node: this.euclidean.node, connectIndex: 0 }
      case "reset":
        return { node: this.euclidean.node, connectIndex: 1 }
      case "output":
        return { node: this.euclidean.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    if (this.pollingInterval !== undefined) {
      cancelAnimationFrame(this.pollingInterval)
    }
    this.stepListeners.clear()
    this.cleanupHandler?.()
    this.euclidean?.free()
  }
}
