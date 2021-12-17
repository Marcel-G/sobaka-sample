import { SamplerNode } from '../sampler.node'
import { ModuleStateDTO, ModuleType } from '../../pkg/sobaka_sample_web_audio_rpc'
import { Subscriber, Unsubscriber } from '../interface'

export abstract class AbstractModule<T extends ModuleType> {
  type: T
  private context: SamplerNode
  module_id?: Promise<number>
  constructor(context: SamplerNode, type: T) {
    this.context = context
    this.type = type
  }

  get_module_id() {
    return this.module_id
  }

  get_context() {
    return this.context
  }

  async create(): Promise<number> {
    this.module_id = this.get_context().client.request({
      method: 'module/create',
      params: [this.type]
    })

    return this.get_module_id()!
  }

  async dispose(): Promise<boolean> {
    const module_id = await this.get_module_id()

    const result = (await this.get_context().client.request({
      method: 'module/dispose',
      params: [module_id]
    })) as boolean

    return result
  }
}

export abstract class AbstractStatefulModule<
  T extends ModuleType,
  State
> extends AbstractModule<T> {
  private unsubscribe_handles: Unsubscriber[] = []

  async create(initial_state?: State): Promise<number> {
    this.module_id = this.get_context().client.request({
      method: 'module/create',
      params: [this.type, initial_state ? this.to_dto(initial_state) : null]
    })

    return this.get_module_id()!
  }

  async update(state: State) {
    const module_id = await this.get_module_id()

    return this.get_context().client.request({
      method: 'module/update',
      params: [module_id, this.to_dto(state)]
    })
  }

  to_dto(state: State): ModuleStateDTO {
    return { [this.type]: state }
  }
  from_dto(state: ModuleStateDTO): State {
    if (this.type in state) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      return state[this.type] as State
    } else {
      throw new Error(`Cannot convert into "${this.type}" state`)
    }
  }

  async subscribe(callback: Subscriber<State>): Promise<Unsubscriber> {
    const module_id = await this.get_module_id()

    let unsubscribe: Unsubscriber | null = this.get_context().subscribe(
      'module/subscribe',
      'module/unsubscribe',
      [module_id!],
      value => callback(this.from_dto(value.result))
    )

    const maybe_unsubscribe = () => {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    }

    this.unsubscribe_handles.push(maybe_unsubscribe)

    return maybe_unsubscribe
  }

  async dispose(): Promise<boolean> {
    this.unsubscribe_handles.forEach(unsubscribe => {
      unsubscribe()
    })

    const module_id = await this.get_module_id()

    const result = (await this.get_context().client.request({
      method: 'module/dispose',
      params: [module_id]
    })) as boolean

    return result
  }
}
