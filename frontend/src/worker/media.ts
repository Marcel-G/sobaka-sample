import { AudioDataTransport, MediaManager, SharedAudio } from 'sobaka-dsp'
import { getContext } from 'svelte'
import { get_repo } from './ipfs'
import { CID } from 'multiformats/cid';

export const MEDIA_CONTEXT = 'MEDIA_CONTEXT'

const MEDIA_PATH = '/media/'

export const init_media = () => {
  let media_manager: MediaManager

  const load = async () => {
    media_manager = new MediaManager()
  }

  const open = async (id: string): Promise<SharedAudio> => {
    const audio = await media_manager.load_with(id, async () => {
      try {
        const chunks: Uint8Array[] = []
        for await (const chunk of get_repo().fs.cat(CID.parse(id))) {
          chunks.push(chunk)
        }

        const blob = new Blob(chunks)
        const file = new File([blob], id)

        return load_audio(id, file).then(into_transport)
      } catch (error) {
        // @todo -- media_manager `load_with` does not properly handle errors
        console.error(error)
        throw error
      }
    })

    return audio
  }

  const store = async (file: File) => {
    const cid = await get_repo().fs.addFile({
      path: file.name,
      content: new Uint8Array(await file.arrayBuffer())
    })

    return cid.toString()
  }

  const list = async () => {
    try {
      const entries: string[] = []

      return entries
    } catch (error) {
      return []
    }
  }

  return {
    load,
    list,
    open,
    store
  }
}

const decode_sample = async (id: string, data: ArrayBuffer): Promise<AudioData> => {
  const audio_data = await new AudioContext().decodeAudioData(data)
  return {
    id,
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

export type AudioData = {
  id: string
  data: Float32Array
  sample_rate: number
}

const load_audio = async (id: string, file: Blob): Promise<AudioData> => {
  if (!file) {
    throw new Error(`Could not locate media file locally.`)
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

const into_transport = (audio: AudioData): AudioDataTransport => ({
  id: audio.id,
  bytes: audio.data.buffer,
  sample_rate: audio.sample_rate
})

export const get_media_context = () =>
  getContext<ReturnType<typeof init_media>>(MEDIA_CONTEXT)
