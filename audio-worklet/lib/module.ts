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

export class Clock extends AbstractModule<'Clock'> {
  constructor(context: SobakaContext, initial_state: Params<'Clock'>) {
    super(context, 'Clock', initial_state)
  }
}

export class Sequencer extends AbstractModule<'Sequencer'> {
  constructor(context: SobakaContext, initial_state: Params<'Sequencer'>) {
    super(context, 'Sequencer', initial_state)
  }
}

export class Envelope extends AbstractModule<'Envelope'> {
  constructor(context: SobakaContext, initial_state: Params<'Envelope'>) {
    super(context, 'Envelope', initial_state)
  }
}

export class Vca extends AbstractModule<'Vca'> {
  constructor(context: SobakaContext, initial_state: Params<'Vca'>) {
    super(context, 'Vca', initial_state)
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