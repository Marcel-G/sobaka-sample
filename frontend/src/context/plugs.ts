import type { PlugType } from '../models/workspace'

// TODO: how to handle these??

export interface ParamContext {
  type: PlugType.Param
  param: AudioParam
}

export interface NodeContext {
  type: PlugType.Input | PlugType.Output | PlugType.Mixer
  connectIndex: number
  module: AudioNode
}
