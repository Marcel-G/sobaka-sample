import { noise } from "@chainsafe/libp2p-noise"
import { kadDHT } from "@libp2p/kad-dht"
import { mplex } from "@libp2p/mplex"
import { yamux } from "@chainsafe/libp2p-yamux"
import { webRTC, webRTCDirect } from "@libp2p/webrtc"
import { createLibp2p as create } from "libp2p"
import { ipniContentRouting } from '@libp2p/ipni-content-routing'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { autoNATService } from 'libp2p/autonat'
import { gossipsub } from "@chainsafe/libp2p-gossipsub"
import type { Datastore } from 'interface-datastore'
import { dcutrService } from 'libp2p/dcutr'
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'
import { multiaddr } from '@multiformats/multiaddr'
import { pingService } from 'libp2p/ping'

export const createLibp2p = async (datastore: Datastore) => {
  const node = await create({
    datastore,
    addresses: {
      listen: [
        '/webrtc',
      ]
    },
    transports: [
      circuitRelayTransport({
        discoverRelays: 1,
      }),
      webRTC(),
      webRTCDirect(),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [
      yamux(),
      mplex()
    ],
    contentRouters: [
      ipniContentRouting('https://cid.contact')
    ],
    // connectionGater: {
    //   denyDialMultiaddr: (multiaddr: Multiaddr) => {
    //     // if (multiaddr.toString().includes('/p2p-circuit/p2p/')) return true

    //     const tuples = multiaddr.stringTuples()

    //     if (tuples[0][0] === 4 || tuples[0][0] === 41) {
    //       return Boolean(isPrivate(`${tuples[0][1]}`))
    //     }

    //     return false
    //   },
    // },
    connectionManager: {
      maxConnections: 100,
      minConnections: 5
    },
    services: {
      ping: pingService(),
      identify: identifyService(),
      autoNAT: autoNATService(),
      dcutr: dcutrService(),
      // https://github.com/ChainSafe/js-libp2p-gossipsub/issues/448
      pubsub: gossipsub({
        emitSelf: true,
        allowPublishToZeroPeers: true,
      }),
      dht: kadDHT({
        clientMode: false,
        validators: {
          ipns: ipnsValidator
        },
        selectors: {
          ipns: ipnsSelector
        }
      })
    }
  })

  node.addEventListener("peer:disconnect", (event) => {
    console.log('peer:disconnect', event)
  })

  node.addEventListener("peer:discovery", (event) => {
    const { detail } = event
    console.log('peer:discovery', detail.id.toString(), detail)
  })

  node.addEventListener("connection:open", (event) => {
    const conns = node.getConnections()
      .map(conn => conn.remoteAddr.toString())

      console.log('connection:open:', conns)
  })
  node.addEventListener("connection:close", async (event) => {
    const conns = node.getConnections()
      .map(conn => conn.remoteAddr.toString())

      console.log('connection:close:', conns)
  })

  node.addEventListener("self:peer:update", (event) => {
    // Update multiaddrs list
    const multiaddrs = node.getMultiaddrs()
      .map((ma) => ma.toString())

    console.log('self:peer:update',multiaddrs)
  })

  await node.dial(multiaddr('/dnsaddr/next.sobaka.marcelgleeson.com'))

  return node
}
