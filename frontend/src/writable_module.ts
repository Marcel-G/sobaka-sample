import type {
  AbstractStatefulModule,
  ModuleType as SobakaModuleType
} from 'sobaka-sample-web-audio'
import type { Writable } from 'svelte/store'

export const as_writable = <M extends AbstractStatefulModule<SobakaModuleType>>(
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

export const bind_with = <M extends AbstractStatefulModule<SobakaModuleType>>(
  module: M,
  store: Writable<M['state']>
): (() => void) => {
  let skip = false

  const cleanup = store.subscribe(state => {
    if (!skip) {
      void module.update(state)
    }
  })

  const async_unsubscribe = module.subscribe(state => {
    // Skip any updates from the store while a value is being set from the module
    // This prevents an infinite loop
    skip = true
    store.set(state)
    skip = false
  })

  return () => {
    cleanup()
    void async_unsubscribe.then(unsubscribe => unsubscribe())
  }
}
