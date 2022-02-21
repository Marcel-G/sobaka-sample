import localforage from 'localforage'

export interface Persistant<S> {
  save(): S
  load(state: S): void
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
      const stored = await state_store.getItem<S>(id)
      if (!stored) {
        return false
      } else {
        state.load(stored)
        return true
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
