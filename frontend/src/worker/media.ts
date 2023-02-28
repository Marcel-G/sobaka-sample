import localforage from 'localforage'
import _ from 'lodash'
import { AudioDataTransport } from 'sobaka-dsp'

const media_store = localforage.createInstance({
  name: 'media_store',
  driver: localforage.INDEXEDDB
})

const decode_sample = async (id: string, data: ArrayBuffer): Promise<AudioData> => {
  const audio_data = await new AudioContext().decodeAudioData(data)
  return {
    id,
    data: audio_data.getChannelData(0),
    sample_rate: audio_data.sampleRate
  }
}

export const list_audio = async () => {
  const files: { name: string; id: string }[] = []

  await media_store.iterate((file: File, id: string) => {
    if (file) {
      files.push({
        name: file.name,
        id
      })
    }
  })

  return files
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
  id: string
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

  return await decode_sample(id, result)
}

export const into_transport = (audio: AudioData): AudioDataTransport => ({
  id: audio.id,
  bytes: audio.data.buffer,
  sample_rate: audio.sample_rate
})
