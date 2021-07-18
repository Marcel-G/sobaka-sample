import type { SamplerNode } from "sobaka-sample-web-audio";
import { get, Readable, Writable } from "svelte/store";

function char_to_int(char) {
  const code = char.toUpperCase().charCodeAt(0)
  if (code > 64 && code < 91) {
    return (code - 65) 
  }
  return null;
}

export function init_key_bindings(
  sampler: SamplerNode,
  instruments: Readable<any>,
  selected_instrument: Writable<string>
) {
  const handle_key_down = (event: KeyboardEvent) => {
    let match

    // a-z to select the active sample
    if (match = /^[a-z]$/.exec(event.key)) {
      const index = char_to_int(match[0]);
      const instrument_list = get(instruments);
      if (index < instrument_list.length) {
        selected_instrument.set(instrument_list[index].uuid);
      }
    }

    // 1-8 Shift+1-8 to assign active sample to spot
    const spot_number = /^Digit(\d)$/
    if (match = spot_number.exec(event.code)) {
      const spot = parseInt(match[1], 10) - 1;
      const instrument = get(selected_instrument);
      if (spot >= 0 && spot <= 7 && instrument) {
        if (event.shiftKey) {
          sampler.assign_instrument(spot + 8, instrument);
        } else {
          sampler.assign_instrument(spot, instrument);
        }
      }
    }

    // @todo space to tigger active sample
  }

  document.addEventListener('keydown', handle_key_down);
  return () => {
    document.removeEventListener('keydown', handle_key_down);
  }
}