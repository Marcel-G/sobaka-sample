export interface Persistant<S> {
  save(): S
  load(state: S): void
}

export const local_storage = <S>(state: Persistant<S>) => {
  const previous = { json: '', id: '' }
  const save = () => {
    const data = JSON.stringify(state.save())
    if (previous.json !== data) {
      const id = Math.random().toString(36).substr(2, 9)
      localStorage.setItem(id, data)

      previous.json = data
      previous.id = id

      return id
    }

    return previous.id
  }
  const load = (id: string): boolean => {
    try {
      const stored = localStorage.getItem(id)
      if (!stored) {
        return false
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const data: S = JSON.parse(stored)
        state.load(data)
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
