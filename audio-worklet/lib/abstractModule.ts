import { SobakaContext } from './sobaka.node'
import { AudioModuleType } from '../bindings/AudioModuleType'
import { SobakaType } from '../bindings/SobakaType'
import { SobakaMessage } from '../bindings/SobakaMessage'

export type NodeType = AudioModuleType['node_type'] | 'Sink'

type Data<T> = T extends { data: any } ? T['data'] : undefined

export type Params<T extends NodeType> = Data<Extract<AudioModuleType, { node_type: T }>>

export abstract class AbstractModule<T extends NodeType> {
  readonly type: T
  private context: SobakaContext
  address: Promise<string>
  constructor(context: SobakaContext, type: T, state: Params<T>) {
    this.context = context
    this.type = type
    this.address = this.create(context, type, state)
  }

  get_address() {
    return this.address
  }

  get_context() {
    return this.context
  }

  async create(context: SobakaContext, type: T, state: Params<T>): Promise<string> {
    return context.client.request({
      method: 'create',
      params: [{ node_type: type, data: state }]
    }) as Promise<string>
  }

  async dispose(): Promise<boolean> {
    const address = await this.get_address()

    const result = (await this.get_context().client.request({
      method: 'dispose',
      params: [address]
    })) as boolean

    return result
  }

  async message(port: string, args: Array<SobakaType>): Promise<void> {
    const address = await this.get_address()
    const payload: SobakaMessage = {
      addr: `${address}/${port}`,
      args 
    }

    await this.get_context().client.request({
      method: 'message',
      params: [payload]
    })
  }
}