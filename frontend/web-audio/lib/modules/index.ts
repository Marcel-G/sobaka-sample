import { SobakaContext } from '../sobaka.node'
import { ModuleStateDTO, ModuleType, InputTypeDTO } from '..'
import { Subscriber, Unsubscriber } from '../interface'

type FromDTO<T, K extends ModuleType> = {
  [P in keyof typeof ModuleType]: P extends keyof T ? Required<T>[P] : never
}[K]

export type Input<T extends ModuleType> = FromDTO<InputTypeDTO, T>
export type State<T extends ModuleType> = FromDTO<ModuleStateDTO, T>

export type AnyInput = Input<ModuleType>
export abstract class AbstractModule<T extends ModuleType> {
  readonly type: T
  private context: SobakaContext
  module_id: Promise<number>
  constructor(context: SobakaContext, type: T, ...args: readonly unknown[]) {
    this.context = context
    this.type = type
    this.module_id = this.create(context, type, ...args)
  }

  get_module_id() {
    return this.module_id
  }

  get_context() {
    return this.context
  }

  to_input_dto(input: Input<T>): InputTypeDTO {
    return { [this.type]: input }
  }

  private create(
    context: SobakaContext,
    type: ModuleType,
    ...args: readonly unknown[]
  ): Promise<number> {
    return context.client.request({
      method: 'module/create',
      params: [type, ...args]
    }) as Promise<number>
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
  T extends ModuleType
> extends AbstractModule<T> {
  private unsubscribe_handles: Unsubscriber[] = []
  state: State<T>
  constructor(context: SobakaContext, type: T, initial_state: State<T>) {
    super(context, type, initial_state ? { [type]: initial_state } : undefined)

    this.state = initial_state
  }

  async update(state: State<T>) {
    const module_id = await this.get_module_id()

    return this.get_context().client.request({
      method: 'module/update',
      params: [module_id, this.to_state_dto(state)]
    })
  }

  to_state_dto(state: State<T>): ModuleStateDTO {
    return { [this.type]: state }
  }

  from_state_dto(state: ModuleStateDTO): State<T> {
    if (this.type in state) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore-next-line
      return state[this.type] as State<T>
    } else {
      throw new Error(`Cannot convert into "${this.type}" state`)
    }
  }

  async subscribe(callback: Subscriber<State<T>>): Promise<Unsubscriber> {
    const module_id = await this.get_module_id()

    let unsubscribe: Unsubscriber | null = this.get_context().subscribe(
      'module/subscribe',
      'module/unsubscribe',
      [module_id],
      value => {
        this.state = this.from_state_dto(value.result)
        callback(this.state)
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

    const module_id = await this.get_module_id()

    const result = (await this.get_context().client.request({
      method: 'module/dispose',
      params: [module_id]
    })) as boolean

    return result
  }
}
