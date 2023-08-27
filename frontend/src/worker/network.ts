import { noise } from "@chainsafe/libp2p-noise"
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
import { type Multiaddr } from "@multiformats/multiaddr"
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'

export const createLibp2p = async (datastore: Datastore) => {
  const node = await create({
    datastore,
    addresses: {
      listen: [
        '/webrtc'
      ]
    },
    transports: [
      webRTCDirect(),
      webRTC({
        rtcConfiguration: {
          iceServers:[{
            // urls: servers.map(s => `stun:${s}`)
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
    // connectionManager: {
    //   dialTimeout: 60000
    // },
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    connectionGater: {
      denyDialMultiaddr: (multiaddr: Multiaddr) => {
        if (multiaddr.toString().includes('/p2p-circuit/p2p/')) return true
        // by default we refuse to dial local addresses from the browser since they
        // are usually sent by remote peers broadcasting undialable multiaddrs but
        // here we are explicitly connecting to a local node so do not deny dialing
        // any discovered address
        return false
      },
    },
    peerDiscovery: [
      bootstrap({
        timeout: 0,
        list: [
          // @todo -- setup dnsaddr
          '/ip4/192.168.178.86/udp/9090/webrtc-direct/certhash/uEiCqVO5UKxxQSixgKG0aVGtAzVoY06vUj1uAqsTFIOm9kw/p2p/12D3KooWNmyGUNnt1xaybMR2C2pXLwnYxy3EnfWN4TkPamxdi5Jy',
          // '/ip4/54.235.239.198/udp/9090/webrtc-direct/certhash/uEiCo_Q0A-X34pNYqoxs_xtyxQr4nu-Z-8o3sCyfp7uSLWg/p2p/12D3KooWSZCye1g4L3kFGQVw5YrCYhBt2hLnG49RTxqnqHAotvBQ'
        ]
      })
    ],
    services: {
      identify: identifyService(),
      autoNAT: autoNATService(),
      // https://github.com/ChainSafe/js-libp2p-gossipsub/issues/448
      pubsub: gossipsub({
        emitSelf: true,
        allowPublishToZeroPeers: true,
      }),
      dht: kadDHT({
        // allowQueryWithZeroPeers: true,
        // kBucketSize: 1,
        protocolPrefix: "/universal-connectivity",
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