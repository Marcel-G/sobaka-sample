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