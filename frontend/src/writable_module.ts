import type { AbstractStatefulModule, ModuleType } from 'sobaka-sample-web-audio'
import type { Writable } from 'svelte/store'

export const as_writable = <M extends AbstractStatefulModule<ModuleType>>(
  module: M
): Writable<M['state']> => {
  const set = (value: M['state']) => {
    void module.update(value)
  }

  const update = (updater: (value: M['state']) => M['state']) => {
    set(updater(module.state))
  }

  const subscribe = (run: (value: M['state']) => void) => {
    run(module.state)
    const async_unsubscribe = module.subscribe(run)
    return () => {
      void async_unsubscribe.then(unsubscribe => unsubscribe())
    }
  }

  return {
    set,
    update,
    subscribe
  }
}
