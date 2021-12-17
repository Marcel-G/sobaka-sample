import type { AbstractStatefulModule } from 'sobaka-sample-web-audio'
import type { Writable } from 'svelte/store'

export const as_writable = <
  T extends AbstractStatefulModule<any, any>,
  S extends ReturnType<T['from_dto']>
>(
  module: T,
  initial_value?: S
): Writable<S> => {
  let last_value: S | null = initial_value || null // @todo find initial state from module

  void module.subscribe((new_value: S) => {
    last_value = new_value
  })

  const set = (value: S) => {
    void module.update(value)
  }

  const update = (updater: (value: S) => S) => {
    set(updater(last_value as S))
  }

  const subscribe = (run: (value: S) => void) => {
    run(last_value as S)
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
