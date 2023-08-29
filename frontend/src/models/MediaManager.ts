import { AudioDataTransport, MediaManager, SharedAudio } from 'sobaka-dsp'
import { SobakaStorage } from '../worker/storage'
import { CID } from 'multiformats/cid'
import { SobakaMediaCollection } from './MediaCollection'

export type AudioData = {
  id: string
  data: Float32Array
  sample_rate: number
}

const into_transport = (audio: AudioData): AudioDataTransport => ({
  id: audio.id,
  bytes: audio.data.buffer,
  sample_rate: audio.sample_rate
})

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

const into_audo_data = async (id: string, data: ArrayBuffer): Promise<AudioData> => {
  const audio_data = await new AudioContext().decodeAudioData(data)
  return {
    id,
    data: audio_data.getChannelData(0),
    sample_rate: audio_data.sampleRate
  }
}

export class SobakaMediaManager {
  private storage: SobakaStorage
  private manager: MediaManager
  private collection: SobakaMediaCollection

  constructor(storage: SobakaStorage, collection: SobakaMediaCollection) {
    this.storage = storage
    this.manager = new MediaManager()
    this.collection = collection
  }

  static async create(storage: SobakaStorage): Promise<SobakaMediaManager> {
    const collection = await SobakaMediaCollection.from_id(storage, storage.get_client_id());
    return new SobakaMediaManager(storage, collection)
  }

  async decode_file(id: string): Promise<SharedAudio> {
    const cid = await CID.parse(id)

    return this.manager.load_with(id, async () => {
      try {
        const file = await this.storage.load_file(cid);

        this.collection.add(cid)

        // Convert file to audio data
        // @todo -- can I use the raw bytes here?
        const buffer = await read_file_async(file)

        if (!(buffer instanceof ArrayBuffer)) {
          throw new Error(`Stored file is not the right format.`)
        }

        const audio_data = await into_audo_data(id, buffer)
        return into_transport(audio_data)
      } catch (error) {
        // @todo -- media_manager `load_with` does not properly handle errors
        console.error(error)
        throw error
      }
    });
  }

  async list(): Promise<string[]> {
    const files = await this.collection.list()

    return files.map((id) => id.toString())
  }

  async add_file(file: File): Promise<string> {
    const cid = await this.storage.add_file(file)

    await this.collection.add(cid)

    return cid.toString()
  }
}