/* eslint-disable no-console */
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { kadDHT } from "@libp2p/kad-dht"
import { gossipsub } from "@chainsafe/libp2p-gossipsub"
import { ipnsSelector } from 'ipns/selector'
import { ipnsValidator } from 'ipns/validator'
import { pingService } from 'libp2p/ping'

import https from 'node:https'
import { S3 } from '@aws-sdk/client-s3';
import { createHelia } from 'helia'

// import { S3Datastore } from 'datastore-s3'
// import { S3Blockstore } from 'blockstore-s3'

export async function main() {
  // Configure S3 as normal
  const s3 = new S3({
    region: 'eu-west-1' // why not us-east?
  })

  const key = await s3.getObject({
    Bucket: 'sobaka-ssl',
    Key: 'bootstrap.next.sobaka.marcelgleeson.com.key',
  })

  const cert = await s3.getObject({
    Bucket: 'sobaka-ssl',
    Key: 'bootstrap.next.sobaka.marcelgleeson.com.crt',
  })

  const ca = await s3.getObject({
    Bucket: 'sobaka-ssl',
    Key: 'bootstrap.next.sobaka.marcelgleeson.com.pem',
  })

  const httpServer = https.createServer({
    cert: await cert.Body?.transformToString(),
    key: await key.Body?.transformToString(),
    ca: await ca.Body?.transformToString(),
  });

  // const datastore = new S3Datastore(s3, '.datastore')
  // const blockstore = new S3Blockstore(s3, '.blockstore')

  const libp2p = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/4001/wss'],
      announce: ['/dns4/bootstrap.next.sobaka.marcelgleeson.com/tcp/443/wss'],
    },
    transports: [
      webSockets({
        server: httpServer,
      })
    ],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],
    services: {
      ping: pingService(),
      identify: identifyService(),
      relay: circuitRelayServer(),
      pubsub: gossipsub({
        emitSelf: true,
        allowPublishToZeroPeers: true,
      }),
      dht: kadDHT({
        clientMode: false,
        protocolPrefix: 'sobaka',
        validators: {
          ipns: ipnsValidator
        },
        selectors: {
          ipns: ipnsSelector
        }
      })
    }
  })

  const node = await createHelia({
    // datastore,
    // blockstore,
    libp2p
  })

  // Implement a pinning service API on top of the node
  // https://github.com/ipfs-shipyard/js-mock-ipfs-pinning-service

  console.log('Relay listening on multiaddr(s): ', node.libp2p.getMultiaddrs().map((ma) => ma.toString()))
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })