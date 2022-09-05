import { SobakaContext } from './sobaka.node'
import { AudioModuleType } from '../../bindings/AudioModuleType'
import { AudioModuleEvent } from '../../bindings/AudioModuleEvent'
import { AudioModuleCommand } from '../../bindings/AudioModuleCommand'
import { Subscriber, Unsubscriber } from './interface'

export type NodeType = AudioModuleType['node_type']

type Data<T> = T extends { data: any } ? T['data'] : undefined

export type Params<T extends NodeType> = Data<Extract<AudioModuleType, { node_type: T }>>
export type Event<T extends NodeType> = Data<Extract<AudioModuleEvent, { node_type: T }>>
export type Command<T extends NodeType> = Data<Extract<AudioModuleCommand, { node_type: T }>>

export abstract class AbstractModule<T extends NodeType> {
  readonly type: T
  private context: SobakaContext
  private unsubscribe_handles: Unsubscriber[] = []
  address: Promise<string>
  constructor(context: SobakaContext, type: T, state: Params<T>) {
    this.context = context
    this.type = type
    this.address = this.create(context, state)
  }

  get_address() {
    return this.address
  }

  get_context() {
    return this.context
  }

  async create(context: SobakaContext, params: Params<T>): Promise<string> {
    return context.client.request({
      method: 'create',
      params: [this.to_module_dto(params)]
    }) as Promise<string>
  }

  async dispose(): Promise<boolean> {
    this.unsubscribe_handles.forEach(unsubscribe => {
      unsubscribe()
    })
    const address = await this.get_address()

    const result = (await this.get_context().client.request({
      method: 'dispose',
      params: [address]
    })) as boolean

    return result
  }

  async message(command: Command<T>): Promise<void> {
    const address = await this.get_address()

    await this.get_context().client.request({
      method: 'message',
      params: [address, this.to_module_dto(command)]
    })
  }

  private to_module_dto<T>(input: T): { node_type: string, data: T } {
    return { node_type: this.type, data: input }
  }

  private from_module_dto<T>(event: { node_type: string, data: T }): T {
    if (event.node_type == this.type) {
      // @ts-ignore-next-line
      return event.data as Event<T>
    } else {
      throw new Error(`Cannot convert into "${this.type}" event`)
    }
  }

  async subscribe<K extends keyof Event<T>>(
    event: K,
    callback: Subscriber<Event<T>[K]>
  ): Promise<Unsubscriber> {
    const address = await this.get_address()

    // @todo only one subscription is needed per module
    let unsubscribe: Unsubscriber | null = this.get_context().subscribe<AudioModuleEvent>(
      'subscribe',
      'unsubscribe',
      [address],
      value => {
        // @todo fix this any
        const response = this.from_module_dto(value.result as any) as Event<T>
        if (event in response) {
          callback(response[event])
        }
      }
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
}