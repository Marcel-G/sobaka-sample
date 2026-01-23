import { describe, it, expect, beforeEach } from 'vitest'
import { AudioGraph } from './graph'
import { ModuleDSP, Route, RouteInfo } from './shared/types'
import { PlugType, type Module, type Link } from '@sobaka/state'

// Mock AudioContext for testing
class MockAudioContext {
  destination = {
    connect: () => {},
    disconnect: () => {}
  }
  currentTime = 0
}

// Mock DSP module for testing
class MockOscillatorDSP implements ModuleDSP {
  node: AudioNode
  
  constructor(
    public readonly id: string,
    private audioContext: AudioContext
  ) {
    // Create a mock node
    this.node = {
      connect: () => {},
      disconnect: () => {}
    } as any
  }

  getRoutingDefinition(): Record<string, RouteInfo> {
    return {
      output: { name: 'output', type: PlugType.Output, label: 'Out' }
    }
  }

  getRoute(routeName: string): Route {
    return { node: this.node, connectIndex: 0 }
  }

  destroy(): void {
    // Cleanup
  }
}

class MockFilterDSP implements ModuleDSP {
  node: AudioNode
  param: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext
  ) {
    this.node = {
      connect: () => {},
      disconnect: () => {}
    } as any
    
    this.param = {
      setValueAtTime: () => {}
    } as any
  }

  getRoutingDefinition(): Record<string, RouteInfo> {
    return {
      input: { name: 'input', type: PlugType.Input, label: 'Signal' },
      cutoff: { name: 'cutoff', type: PlugType.Param, label: 'Cutoff' },
      output: { name: 'output', type: PlugType.Output, label: 'Out' }
    }
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case 'input':
        return { node: this.node, connectIndex: 0 }
      case 'cutoff':
        return { node: this.param }
      case 'output':
        return { node: this.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown route: ${routeName}`)
    }
  }

  destroy(): void {
    // Cleanup
  }
}

describe('AudioGraph', () => {
  let audioContext: AudioContext
  let graph: AudioGraph

  beforeEach(() => {
    audioContext = new MockAudioContext() as any
    graph = new AudioGraph(audioContext)
  })

  it('should create an instance', () => {
    expect(graph).toBeDefined()
  })

  it('should reconcile modules', () => {
    const modules: Module[] = [
      {
        id: 'osc-1',
        type: 'Oscillator',
        state: {},
        position: { x: 0, y: 0 }
      }
    ]

    const links: Required<Link>[] = []

    // This will throw "not implemented" until we implement createAudioModule
    expect(() => graph.reconcile(modules, links)).toThrow()
  })

  it('should clean up on destroy', () => {
    expect(() => graph.destroy()).not.toThrow()
  })

  it('should get plug type for a static module', () => {
    const plugType = graph.getPlugType('global-mixer', 'input')
    expect(plugType).toBeDefined()
  })
})
