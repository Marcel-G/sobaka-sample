declare const __phantom: unique symbol
type Phantom<T> = { [__phantom]: T }

export type SubDocReference<T> = { guid: string } & Phantom<T>
