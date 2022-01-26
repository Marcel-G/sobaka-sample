import { SobakaContext } from '../sobaka.node'
import { NodeStateDTO, NodeType, AudioInput as NodeInputTypeDTO, NodeEventDTO } from '..'
import { Subscriber, Unsubscriber } from '../interface'

type FromDTO<T, K extends NodeType> = {
  [P in keyof typeof NodeType]: P extends keyof T ? Required<T>[P] : never
}[K]

export type Input<T extends NodeType> = FromDTO<NodeInputTypeDTO, T>
export type State<T extends NodeType> = FromDTO<NodeStateDTO, T>
export type Event<T extends NodeType> = FromDTO<NodeEventDTO, T>

export type AnyInput = Input<NodeType>

export abstract class AbstractNode<T extends NodeType> {
  readonly type: T
  private context: SobakaContext
  node_id: Promise<number>
  constructor(context: SobakaContext, type: T, ...args: readonly unknown[]) {
    this.context = context
    this.type = type
    this.node_id = this.create(context, type, ...args)
  }

  get_node_id() {
    return this.node_id
  }

  get_context() {
    return this.context
  }

  to_input_dto(input: Input<T>): NodeInputTypeDTO {
    return { [this.type]: input }
  }

  private create(
    context: SobakaContext,
    type: NodeType,
    ...args: readonly unknown[]
  ): Promise<number> {
    return context.client.request({
      method: 'node/create',
      params: [type, ...args]
    }) as Promise<number>
  }

  async dispose(): Promise<boolean> {
    const node_id = await this.get_node_id()

    const result = (await this.get_context().client.request({
      method: 'node/dispose',
      params: [node_id]
    })) as boolean

    return result
  }
}

export abstract class AbstractStatefulNode<T extends NodeType> extends AbstractNode<T> {
  state: State<T>
  constructor(context: SobakaContext, type: T, initial_state: State<T>) {
    super(context, type, initial_state ? { [type]: initial_state } : undefined)

    this.state = initial_state
  }

  async update(state: State<T>) {
    const node_id = await this.get_node_id()

    return this.get_context().client.request({
      method: 'node/update',
      params: [node_id, this.to_state_dto(state)]
    })
  }

  to_state_dto(state: State<T>): NodeStateDTO {
    return { [this.type]: state }
  }

  from_state_dto(state: NodeStateDTO): State<T> {
    if (this.type in state) {
      // @ts-ignore-next-line
      return state[this.type] as State<T>
    } else {
      throw new Error(`Cannot convert into "${this.type}" state`)
    }
  }
}

export abstract class AbstractStatefulEmitterNode<
  T extends NodeType
> extends AbstractStatefulNode<T> {
  private unsubscribe_handles: Unsubscriber[] = []
  constructor(context: SobakaContext, type: T, initial_state: State<T>) {
    super(context, type, initial_state)
  }

  from_event_dto(event: NodeEventDTO): Event<T> {
    if (this.type in event) {
      // @ts-ignore-next-line
      return event[this.type] as Event<T>
    } else {
      throw new Error(`Cannot convert into "${this.type}" event`)
    }
  }

  async subscribe<K extends keyof Event<T>>(
    event: K,
    callback: Subscriber<Event<T>[K]>
  ): Promise<Unsubscriber> {
    const node_id = await this.get_node_id()

    // @todo only one subscription is needed per module
    let unsubscribe: Unsubscriber | null = this.get_context().subscribe<NodeEventDTO>(
      'node/subscribe',
      'node/unsubscribe',
      [node_id],
      value => {
        const response = this.from_event_dto(value.result)
        if (response[event]) {
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

  async dispose(): Promise<boolean> {
    this.unsubscribe_handles.forEach(unsubscribe => {
      unsubscribe()
    })

    const node_id = await this.get_node_id()

    const result = (await this.get_context().client.request({
      method: 'node/dispose',
      params: [node_id]
    })) as boolean

    return result
  }
}
