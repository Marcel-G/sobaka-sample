import { AbstractStatefulNode } from '.'
import { MidiOutputMode } from '../../bindings/MidiOutputMode'
import { SobakaContext } from '../sobaka.node'

export class Midi extends AbstractStatefulNode<'Midi'> {
  constructor(context: SobakaContext, mode: MidiOutputMode ) {
    super(context, 'Midi', { OutputMode: mode })
  }
}
