import { SobakaContext } from '../sobaka.node'
import { Subscriber, Unsubscriber } from '../interface'
import { AudioNodeEvent, AudioNodeInput, AudioNodeState } from '../generatedAudioNodes'

export type NodeType = AudioNodeState['node_type']

type Data<T> = T extends { data: any } ? T['data'] : undefined

export type Input<T extends NodeType> = Data<Extract<AudioNodeInput, { node_type: T }>>
export type State<T extends NodeType> = Data<Extract<AudioNodeState, { node_type: T }>>
export type Event<T extends NodeType> = Data<Extract<AudioNodeEvent, { node_type: T }>>

export type AnyInput = Input<NodeType>
export abstract class AbstractNode<T extends NodeType> {
  readonly type: T
  private context: SobakaContext
  node_id: Promise<number>
  constructor(context: SobakaContext, type: T, state: State<T>) {
    this.context = context
    this.type = type
    this.node_id = this.create(context, type, state)
  }

  get_node_id() {
    return this.node_id
  }

  get_context() {
    return this.context
  }

  to_input_dto(input: Input<T>): any {
    // AudioNodeInput {
    return { node_type: this.type, data: input }
  }

  private create(context: SobakaContext, type: T, state: State<T>): Promise<number> {
    return context.client.request({
      method: 'node/create',
      params: [{ node_type: type, data: state }]
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
    super(context, type, initial_state)

    this.state = initial_state
  }

  async update(state: State<T>) {
    const node_id = await this.get_node_id()

    return this.get_context().client.request({
      method: 'node/update',
      params: [node_id, { node_type: this.type, data: state }]
    })
  }

  from_state_dto(state: AudioNodeState): State<T> {
    if (state.node_type == this.type) {
      // @ts-ignore-next-line
      return state.data as State<T>
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

  from_event_dto(event: AudioNodeEvent): Event<T> {
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
    const node_id = await this.get_node_id()

    // @todo only one subscription is needed per module
    let unsubscribe: Unsubscriber | null = this.get_context().subscribe<AudioNodeEvent>(
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
