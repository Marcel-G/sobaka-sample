import * as Y from 'yjs'
import { WebrtcConn, WebrtcProvider, type ProviderOptions } from 'y-webrtc'

type SignalingMessage = {
  type: string
  identity: string
  kind: 'client' | 'worker'
  data: { from: string }
}

type MessageFilter = (from: string, data: Uint8Array) => boolean

export class VerifiedRTCProvider extends WebrtcProvider {
  private peers = new WeakSet<WebrtcConn>()
  private verifiedPeerIdentities = new Map<string, string>()
  private verifiedWorkerIdentities = new Map<string, string>()
  private filterIncomingMessage: MessageFilter
  private currentUser: null | string = null

  constructor(
    name: string,
    doc: Y.Doc,
    options: ProviderOptions & { filterIncomingMessage?: MessageFilter }
  ) {
    super(name, doc, options)

    this.filterIncomingMessage = options.filterIncomingMessage || (() => true)

    for (const signal of this.signalingConns) {
      signal.on('message', (message: SignalingMessage) =>
        this.handle_signal_message(message)
      )

      signal.on('disconnect', () => {
        console.log('disconnect')
      })
    }

    this.on('peers', () => {
      this.handle_peer_change()
    })
  }

  private handle_peer_change() {
    for (const conn of this.room?.webrtcConns?.values() || []) {
      if (this.peers.has(conn)) continue

      const existingListeners: Array<(data: Uint8Array) => void> =
        conn.peer.listeners('data')
      existingListeners.forEach(listener => conn.peer.off('data', listener))

      conn.peer.on('data', (data: Uint8Array) => {
        const workerIdentity = this.verifiedWorkerIdentities.get(conn.remotePeerId)
        if (workerIdentity) {
          existingListeners.forEach(listener => listener(data))
          return
        }

        const peerIdentity = this.verifiedPeerIdentities.get(conn.remotePeerId)
        if (!peerIdentity) return

        if (
          this.filterIncomingMessage(peerIdentity, data) ||
          is_read_only_message(data)
        ) {
          existingListeners.forEach(listener => listener(data))
        } else {
          console.warn(`Received message from unauthorized peer: ${peerIdentity}`)
        }
      })

      this.peers.add(conn)
    }
  }

  private handle_signal_message(message: SignalingMessage) {
    if (message.type === 'publish') {
      const { data, identity, kind } = message
      if (kind === 'client' && !this.verifiedPeerIdentities.has(data.from)) {
        this.verifiedPeerIdentities.set(data.from, identity)
        // TODO: cleanup after we loose connection to peer

        if (
          this.room &&
          !this.currentUser &&
          this.verifiedPeerIdentities.has(this.room.peerId)
        ) {
          this.currentUser = this.verifiedPeerIdentities.get(this.room.peerId) || null
          this.emit('user', [this.currentUser])

          // TODO: assign user as owner before sharing
        }
      }
      if (kind === 'worker' && !this.verifiedWorkerIdentities.has(data.from)) {
        this.verifiedWorkerIdentities.set(data.from, identity)
      }
    }
  }
}

function is_read_only_message(data: Uint8Array) {
  const [byte1, byte2] = data
  // It suffices to read the first two bytes in order to determine whether a message should be accepted from a read-only user.
  // https://github.com/yjs/y-protocols/blob/40dbe4eebb1e53a7e86932ef3232f9abd5037569/PROTOCOL.md?plain=1#L100-L111

  // Allow only SyncStep1 messages ([0, 0, ...])
  if (byte1 === 0 && byte2 === 0) return true
  // Allow awareness messages
  if (byte1 === 1) return true
  return false
}
