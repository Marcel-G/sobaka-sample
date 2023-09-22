import { noise } from "@chainsafe/libp2p-noise"
import isPrivate from 'private-ip'
import { kadDHT } from "@libp2p/kad-dht"
import { mplex } from "@libp2p/mplex"
import { webRTC, webRTCDirect } from "@libp2p/webrtc"
import { createLibp2p as create } from "libp2p"
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { autoNATService } from 'libp2p/autonat'
import { gossipsub } from "@chainsafe/libp2p-gossipsub"
import type { Datastore } from 'interface-datastore'
import { bootstrap } from "@libp2p/bootstrap"
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'
import { webSockets  } from "@libp2p/websockets"
import { type Multiaddr } from '@multiformats/multiaddr'
import { TOPIC, pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery'
import { webTransport } from "@libp2p/webtransport"
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
      webSockets(),
      webRTCDirect(),
      webRTC({
        rtcConfiguration: {
          iceServers:[{
            urls: [
              'stun:stun.l.google.com:19302',
              'stun:global.stun.twilio.com:3478'
            ]
          }]
        }
      }),
      circuitRelayTransport({
        discoverRelays: 1,
      }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    connectionGater: {
      denyDialMultiaddr: (multiaddr: Multiaddr) => {
        if (multiaddr.toString().includes('/p2p-circuit/p2p/')) return true

        const tuples = multiaddr.stringTuples()

        if (tuples[0][0] === 4 || tuples[0][0] === 41) {
          return Boolean(isPrivate(`${tuples[0][1]}`))
        }

        return false
      },
    },
    connectionManager: {
      maxConnections: 10,
      minConnections: 5
    },
    peerDiscovery: [
      bootstrap({
        list: [
          '/ip4/34.224.25.21/udp/9090/webrtc-direct/certhash/uEiAvqGRWnmpkLZGw9CShseyDZEDDCOLMUSp8Je_A0SX8wg/p2p/12D3KooWKJjhikLtY9sZyFFHVg4mZaDVSodKCjQ6XwgaE6kDe62y',
          // '/dns4/elastic.dag.house/tcp/443/wss/p2p/bafzbeibhqavlasjc7dvbiopygwncnrtvjd2xmryk5laib7zyjor6kf3avm',
          // '/ip4/192.168.178.86/udp/9090/webrtc-direct/certhash/uEiBlkoDXQqqWQreuLYsyw1oAE7F2xUrC8eueWZWBGiPC6A/p2p/12D3KooWMYZs6qRyZmPXgUmSHwW412PRHVroK2MSc2ehQJss3LVz',
          // '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          // '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          // '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          // '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
          // '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        ]
      })
    ],
    services: {
      ping: pingService(),
      identify: identifyService(),
      autoNAT: autoNATService(),
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

  return node
}