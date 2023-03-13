import { create, IPFS } from 'ipfs-core'
import { User } from './user'

let ipfs: IPFS

export const init_repo = async (user: User) => {
  if (!ipfs) {
    ipfs = await create({
      repo: `sobaka-${user.uuid}`,
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
