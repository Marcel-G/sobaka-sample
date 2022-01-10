export const replace = <T>(
  predicate: (item: T) => boolean,
  updater: (item: T) => T
): ((list: T[]) => T[]) => {
  return list => {
    const index = list.findIndex(predicate)
    if (index < 0) return list

    return [...list.slice(0, index), updater(list[index]), ...list.slice(index + 1)]
  }
}
