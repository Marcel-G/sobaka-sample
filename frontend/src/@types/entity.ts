export interface Entity<T, I extends string | number | symbol = string> {
  ids: I[]
  entities: Record<I, T>
}
