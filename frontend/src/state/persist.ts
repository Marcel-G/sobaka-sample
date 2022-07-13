import localforage from 'localforage'

export interface Persistant<S> {
  save(): S
  load(state: S): void
  fresh: S
}

export const local_storage = <S>(state: Persistant<S>) => {
  const state_store = localforage.createInstance({
    name: 'state_store',
    driver: localforage.INDEXEDDB
  })

  const save = async (id?: string): Promise<string | undefined> => {
    try {
      let use_id = Math.random().toString(36).substr(2, 9)
      if (id) {
        const exists = await state_store.getItem(id)
        if (exists) {
          use_id = id
        }
      }
      await state_store.setItem(use_id, state.save())
      return use_id
    } catch (error) {
      console.error(error)
    }
  }

  const load = async (id: string): Promise<boolean> => {
    try {
      if (id === 'new') {
        // Load fresh patch
        state.load(state.fresh)
        return true
      } else if (id === 'example') {
        // Load patch remotely
        /**
         * @todo Add backend to fetch remote patches
         */
        const data = await import('../../static/example.json')
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        state.load(data.default)
        return true
      } else {
        // Load patch locally
        const stored = await state_store.getItem<S>(id)
        if (!stored) {
          return false
        } else {
          state.load(stored)
          return true
        }
      }
    } catch (error) {
      return false
    }
  }

  return {
    save,
    load
  }
}
