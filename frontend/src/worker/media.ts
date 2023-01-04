import localforage from 'localforage'
import { AudioDataTransport } from 'sobaka-sample-audio-worklet'

const media_store = localforage.createInstance({
  name: 'media_store',
  driver: localforage.INDEXEDDB
})

const decode_sample = async (data: ArrayBuffer): Promise<AudioData> => {
  const audio_data = await new AudioContext().decodeAudioData(data)
  return {
    data: audio_data.getChannelData(0),
    sample_rate: audio_data.sampleRate
  }
}

const read_file_async = async (file: File): Promise<string | ArrayBuffer | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      resolve(reader.result)
    }

    reader.onerror = reject

    reader.readAsArrayBuffer(file)
  })
}

// Public interface

export const store_audio = async (file: Blob) => {
  const id = Math.random().toString(36).substr(2, 9)
  await media_store.setItem(id, file)

  return id
}

export type AudioData = {
  data: Float32Array
  sample_rate: number
}

export const load_audio = async (id: string): Promise<AudioData> => {
  const file = await media_store.getItem<Blob>(id)
  if (!file) {
    throw new Error(`Could not locate media file with id ${id} locally.`)
  }
  if (!(file instanceof File)) {
    throw new Error(`Stored blob is not a file.`)
  }
  const result = await read_file_async(file)

  if (!(result instanceof ArrayBuffer)) {
    throw new Error(`Stored file is not the right format.`)
  }

  return await decode_sample(result)
}

export const into_transport = (audio: AudioData): AudioDataTransport => ({
  bytes: audio.data.buffer,
  sample_rate: audio.sample_rate
})
