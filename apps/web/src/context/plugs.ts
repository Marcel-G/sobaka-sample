import type { PlugType } from '@sobaka/state/models/links'

export interface ParamContext {
  type: PlugType.Param
  param: AudioParam
}

export interface NodeContext {
  type: PlugType.Input | PlugType.Output | PlugType.Mixer
  connectIndex: number
  module: AudioNode
}
