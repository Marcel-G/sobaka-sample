import { SignalingClient } from '@sobaka/state/networking/webrtc'
import { UserSession } from '@sobaka/state/persistence'
import { writable, type Readable } from 'svelte/store'
import { getContext, setContext } from 'svelte'
import type { SubDocReference } from '@sobaka/state/util/subdoc'
import { Root } from '@sobaka/state/models/root'
import { Workspace, type User } from '@sobaka/state/models/workspace'
import { WorkspaceList } from '@sobaka/state/models/workspaceList'
import { EmptyDocument } from '@sobaka/state/models/docMeta'
import { load } from './audio'
import type { Config as ConfigApi } from '../routes/proxy+layout.server'
import { SyncedDocFactory, type Config } from '@sobaka/state/models/syncedDoc'
import { pluginRegistry } from '../plugins'

// TODO: this is more like a context
export const createGlobalCtx = async (config: ConfigApi) => {
  const global = new Global(config)
  setContext('Global', global)
  await global.load()
  return global
}

export const getGlobalCtx = () => {
  return getContext<Global>('Global')
}

const PING_INTERVAL = 30e3

export class Global {
  /** Signaling client - created directly for identity verification, then shared with providers */
  private signalingClient: SignalingClient
  private session: UserSession
  private _root: Root | null = null
  private _isOnline = writable(false)
  private _isAdmin = writable(false)
  private lastPong: number = 0

  audio = new AudioContext()
  workspaces = new SyncedDocFactory<Workspace>(ref => Workspace.fromRef(this.config, ref))
  lists = new SyncedDocFactory<WorkspaceList>(ref =>
    WorkspaceList.fromRef(this.config, ref)
  )

  constructor(private _config: ConfigApi) {
    // Initialize user session (manages identity + persistence)
    this.session = new UserSession()
    
    // Create signaling client directly for identity verification
    // This client will be shared with PeerManager once identity is verified
    this.signalingClient = new SignalingClient({ 
      url: _config.signaling[0] 
    })

    // Handle welcome message with verified identity and role
    this.signalingClient.on('welcome', (identity: string, kind) => {
      const role = kind as 'client' | 'worker' | 'admin'
      this._isAdmin.set(role === 'admin')
      
      // Update session with verified identity (handles conflicts with localStorage)
      this.session.handleWelcome(identity, role).catch(err => {
        console.error('Failed to handle welcome:', err)
      })
    })

    this.signalingClient.on('connect', () => {
      this._isOnline.set(true)
    })

    this.signalingClient.on('disconnect', () => {
      this._isOnline.set(false)
    })

    this.signalingClient.on('message', (message) => {
      if (message.type === 'pong') {
        this.handlePong()
      }
    })
    
    // Connect immediately to start identity verification
    this.signalingClient.connect()
  }
  
  /**
   * Get the signaling clients to share with VerifiedRTCProvider instances
   * This allows all providers to share the same signaling connection
   */
  getSignalingClients(): SignalingClient[] {
    return [this.signalingClient]
  }

  get config(): Config {
    return {
      ...this._config,
      currentUser: this.user.uuid,
      // Share the signaling client with all VerifiedRTCProvider instances
      signalingClients: this.getSignalingClients(),
      persistence: this.session.persistenceOrNull ?? undefined,
      getInitialState: (type: string) => pluginRegistry.getInitialState(type),
      isAdmin: this._isAdmin
    }
  }

  get user(): User {
    const userId = this.session.userId
    if (!userId) {
      throw new Error('User not initialized')
    }
    return { uuid: userId }
  }

  get root(): Root {
    const root = this._root
    if (!root) {
      throw new Error('Root not initialized')
    }
    return root
  }

  get isOnline(): Readable<boolean> {
    return this._isOnline
  }

  get isAdmin(): Readable<boolean> {
    return this._isAdmin
  }

  async load(onStatusChange?: (status: string) => void) {
    onStatusChange?.('Initializing audio...')
    await load(this.audio)

    // Try to restore session from localStorage (instant if available)
    onStatusChange?.('Restoring session...')
    const restored = await this.session.restore()
    
    if (!restored) {
      // No stored session - wait for welcome message from signaling
      onStatusChange?.('Connecting to network...')
      await this.session.whenReady()
    }

    onStatusChange?.('Verifying identity...')

    // Load user's root document
    // The root contains references to:
    // - workspaceLists[0]: Global intro list (well-known UUID, readonly for non-admins)
    // - workspaceLists[1]: User's "My Workspaces" list
    this._root = Root.fromRef(
      { guid: this.user.uuid } as SubDocReference<Root>,
      this.config
    )

    this.root.synced(() => {
      // Ensure root has required structure
      this.root.migrate({
        workspaces: this.workspaces,
        lists: this.lists
      })
    })

    onStatusChange?.('Loading your data...')

    try {
      await this._root.load({ localOnly: true })
    } catch (error: unknown) {
      if (error instanceof EmptyDocument) {
        this._root.create(this.user.uuid)
      } else {
        throw error
      }
    }
  }

  public createFork(workspace: Workspace) {
    const fork = workspace.fork()
    const userList = this.lists.get(this.root.userList())
    userList.synced(() => {
      userList.add(fork)
    })

    return fork
  }

  public createWorkspace() {
    const workspace = this.workspaces.get()
    workspace.create(this.config.currentUser)
    const userList = this.lists.get(this.root.userList())
    userList.synced(() => {
      userList.add(workspace)
    })

    return workspace
  }

  cleanup() {
    this.audio.close()
    this._root?.destroy()
    this.workspaces.clear()
    this.lists.clear()
    this.session.destroy()
    this.signalingClient.disconnect()
  }

  private handlePong() {
    this._isOnline.set(true)
    clearTimeout(this.lastPong)
    this.lastPong = Number(
      setTimeout(() => {
        this._isOnline.set(false)
      }, PING_INTERVAL)
    )
  }
}
