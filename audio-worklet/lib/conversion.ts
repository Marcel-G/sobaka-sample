import { SobakaType } from "../bindings/SobakaType"

export const In = (n: number) => `in-${n}`
export const Out = (n: number) => `out-${n}`
export const Param = (n: number) => `param-${n}`

export const Int = (n: number): SobakaType => ({ Int: n })
export const Float = (n: number): SobakaType => ({ Float: n })
export const String = (s: string): SobakaType => ({ String: s })
export const Long = (n: bigint): SobakaType => ({ Long: n })

// @todo some other SobakaType are possible