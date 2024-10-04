export const WINDOW_SIZE = 1 // 1 second of audio is shown in the detail view.

export type AudioData = {
  id: string
  data: Float32Array
  sample_rate: number
}
