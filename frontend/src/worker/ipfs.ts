
import { createHelia } from 'helia'
import { UnixFS, unixfs } from '@helia/unixfs'
import { User } from './user'

import { IDBBlockstore } from 'blockstore-idb'
import { IDBDatastore } from 'datastore-idb'
import { Helia } from '@helia/interface'
import { createLibp2p } from './libp2p'

let ipfs: { fs: UnixFS, helia: Helia }

export const init_repo = async (user: User) => {
  if (!ipfs) {
    const blockstore = new IDBBlockstore(user.uuid)
    const datastore = new IDBDatastore(user.uuid)

    await blockstore.open()
    await datastore.open()

    // libp2p is the networking layer that underpins Helia
    const libp2p = await createLibp2p(
      datastore
    )

    // create a Helia node
    const helia = await createHelia({
      datastore: datastore,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore 
      blockstore: blockstore,
      libp2p
    })

    const fs = unixfs(helia)

    ipfs = {
      fs,
      helia
    }
  }
}

export const get_repo = () => {
  if (!ipfs) {
    throw new Error('FS not initialised')
  }
  return ipfs
}

export const get_fs = () => {
  if (!ipfs.fs) {
    throw new Error('FS not initialised')
  }
  return ipfs.fs
}

export const get_helia = () => {
  if (!ipfs.helia) {
    throw new Error('IPFS repo not initialised')
  }
  return ipfs.helia
}

