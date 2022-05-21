import { AbstractModule, Params } from './abstractModule'
import { SobakaContext } from './sobaka.node'

export class Oscillator extends AbstractModule<'Oscillator'> {
  constructor(context: SobakaContext, initial_state: Params<'Oscillator'>) {
    super(context, 'Oscillator', initial_state)
  }
}

export class Parameter extends AbstractModule<'Parameter'> {
  constructor(context: SobakaContext, initial_state: Params<'Parameter'>) {
    super(context, 'Parameter', initial_state)
  }
}

export class Reverb extends AbstractModule<'Reverb'> {
  constructor(context: SobakaContext, initial_state: Params<'Reverb'>) {
    super(context, 'Reverb', initial_state)
  }
}

export class Filter extends AbstractModule<'Filter'> {
  constructor(context: SobakaContext, initial_state: Params<'Filter'>) {
    super(context, 'Filter', initial_state)
  }
}

export class Sink extends AbstractModule<'Sink'> {
  constructor(context: SobakaContext) {
    super(context, 'Sink', undefined as never)
  }

  async create(): Promise<string> {
    return Promise.resolve('/sobaka/1') // @todo - better way to target the output node
  }

  async dispose(): Promise<boolean> {
    return Promise.resolve(true)
  }
}