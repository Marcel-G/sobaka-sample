import { create, IPFS } from 'ipfs-core'

let ipfs: IPFS

export const init_repo = async () => {
  if (!ipfs) {
    ipfs = await create({
      repo: 'sobaka',
      init: { algorithm: 'Ed25519' }
    })
  }
}

export const get_repo = () => {
  if (!ipfs) {
    throw new Error('IPFS repo not initialised')
  }
  return ipfs
}
