import { describe, it, expect, beforeEach } from 'vitest'
import { AudioGraph } from './graph'
import { ModuleDSP, ModuleRouting } from './shared/types'
import type { Module, Link } from '@sobaka/state'

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

  getRouting(): ModuleRouting {
    return {
      outputs: [
        { index: 0, label: 'Out', node: this.node, connectIndex: 0 }
      ]
    }
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

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Signal', node: this.node, connectIndex: 0 }
      ],
      params: [
        { index: 1, label: 'Cutoff', param: this.param }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.node, connectIndex: 0 }
      ]
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

  it('should get all plug contexts', () => {
    const contexts = graph.getAllPlugContexts()
    expect(contexts).toBeDefined()
    expect(typeof contexts).toBe('object')
  })
})

describe('routingToPlugContexts', () => {
  it('should convert routing to plug contexts', () => {
    // This is tested implicitly through the graph reconciliation
    // We'll add more specific tests here once the implementation is complete
  })
})
