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

export class Noise extends AbstractModule<'Noise'> {
  constructor(context: SobakaContext) {
    super(context, 'Noise', undefined)
  }
}

export class Vca extends AbstractModule<'Vca'> {
  constructor(context: SobakaContext, initial_state: Params<'Vca'>) {
    super(context, 'Vca', initial_state)
  }
}

export class Delay extends AbstractModule<'Delay'> {
  constructor(context: SobakaContext, initial_state: Params<'Delay'>) {
    super(context, 'Delay', initial_state)
  }
}

export class Scope extends AbstractModule<'Scope'> {
  constructor(context: SobakaContext, initial_state: Params<'Scope'>) {
    super(context, 'Scope', initial_state)
  }
}

export class Output extends AbstractModule<'Output'> {
  constructor(context: SobakaContext) {
    super(context, 'Output', undefined as never)
  }
}

export class String extends AbstractModule<'String'> {
  constructor(context: SobakaContext, initial_state: Params<'String'>) {
    super(context, 'String', initial_state)
  }
}

export class Lfo extends AbstractModule<'Lfo'> {
  constructor(context: SobakaContext, initial_state: Params<'Lfo'>) {
    super(context, 'Lfo', initial_state)
  }
}

export class Quantiser extends AbstractModule<'Quantiser'> {
  constructor(context: SobakaContext, initial_state: Params<'Quantiser'>) {
    super(context, 'Quantiser', initial_state)
  }
}

export class SampleAndHold extends AbstractModule<'SampleAndHold'> {
  constructor(context: SobakaContext) {
    super(context, 'SampleAndHold', undefined as never)
  }
}