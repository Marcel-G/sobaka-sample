import * as Y from 'yjs'
import { VerifiedRTCProvider } from '@sobaka/state/networking/provider'
import { uuidv4 } from 'lib0/random'
import { writable, type Readable } from 'svelte/store'
import { getContext, setContext } from 'svelte'
import type { SubDocReference } from '@sobaka/state/util/subdoc'
import { Root } from '@sobaka/state/models/root'
import { Workspace, type User } from '@sobaka/state/models/workspace'
import { WorkspaceList } from '@sobaka/state/models/workspaceList'
import { EmptyDocument } from '@sobaka/state/models/docMeta'
import { load } from './audio'
import type { Config as ConfigApi } from '../routes/proxy+layout.server'
import { SyncedDocFactory, GLOBAL_ROOT_UUID, type Config } from '@sobaka/state/models/syncedDoc'
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
  private rtc: VerifiedRTCProvider
  private _user: User | null = readLocalUser()
  private _root: Root | null = null
  private _globalRoot: Root | null = null
  private _isOnline = writable(false)
  private _isAdmin = writable(false)
  private lastPong: number = 0

  audio = new AudioContext()
  workspaces = new SyncedDocFactory<Workspace>(ref => Workspace.fromRef(this.config, ref))
  lists = new SyncedDocFactory<WorkspaceList>(ref =>
    WorkspaceList.fromRef(this.config, ref)
  )

  constructor(private _config: ConfigApi) {
    // TODO: hack just to get verified user uuid from signaling server
    //       refactor so that signaling can be initialized on it's own
    this.rtc = new VerifiedRTCProvider(uuidv4(), new Y.Doc(), {
      maxConns: 0,
      signaling: _config.signaling
    })

    this.rtc.once('user', (uuid: string) => {
      this.handleIdentityChange(uuid)
    })

    this.rtc.once('welcome', (_identity: string, kind: string) => {
      this._isAdmin.set(kind === 'admin')
    })

    for (const signal of this.rtc.signalingConns) {
      signal.on('connect', () => {
        this._isOnline.set(true)
      })

      signal.on('disconnect', () => {
        this._isOnline.set(false)
      })

      signal.on('message', (message: unknown) => {
        if (
          typeof message == 'object' &&
          message !== null &&
          'type' in message &&
          message.type === 'pong'
        ) {
          this.handlePong()
        }
      })
    }
  }

  get config(): Config {
    return {
      ...this._config,
      currentUser: this.user.uuid,
      getInitialState: (type: string) => pluginRegistry.getInitialState(type)
    }
  }

  get user(): User {
    const user = this._user
    if (!user) {
      throw new Error('User not initialized')
    }
    return user
  }

  get root(): Root {
    const root = this._root
    if (!root) {
      throw new Error('Root not initialized')
    }
    return root
  }

  get globalRoot(): Root {
    const globalRoot = this._globalRoot
    if (!globalRoot) {
      throw new Error('Global root not initialized')
    }
    return globalRoot
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

    if (!this._user) {
      onStatusChange?.('Connecting to network...')
      await new Promise<void>(resolve => {
        // @ts-expect-error - TODO: user event isn't part of type definition
        this.rtc.once('user', resolve)
      })
    }

    onStatusChange?.('Verifying identity...')

    // Load user's personal root
    this._root = Root.fromRef(
      { guid: this.user.uuid } as SubDocReference<Root>,
      this.config
    )

    this.root.synced(() => {
      this.root.migrate({
        workspaces: this.workspaces,
        lists: this.lists
      }, 'My Workspaces')
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

    // Load global root (readonly for non-admins, contains "Intro" list)
    onStatusChange?.('Loading shared workspaces...')
    
    this._globalRoot = Root.fromRef(
      { guid: GLOBAL_ROOT_UUID } as SubDocReference<Root>,
      this.config
    )

    // Don't migrate global root - only admins can do that
    // Just load it and display whatever is there
    // Use a timeout to prevent hanging if persistence hasn't created it yet
    try {
      await Promise.race([
        this._globalRoot.load({ localOnly: false }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Global root load timeout')), 5000)
        )
      ])
    } catch (error: unknown) {
      // Global root may not exist yet or timed out - that's OK
      if (error instanceof EmptyDocument) {
        console.debug('Global root is empty, waiting for admin to populate')
      } else if (error instanceof Error && error.message === 'Global root load timeout') {
        console.debug('Global root load timed out, continuing without it')
      } else {
        console.warn('Failed to load global root:', error)
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
    this._globalRoot?.destroy()
    this.workspaces.clear()
    this.lists.clear()
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

  private handleIdentityChange(uuid: string) {
    const user = { uuid }
    writeLocalUser(user)
    this._user = user
  }
}

const SOBAKA_USER = 'sobaka-user'

const readLocalUser = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem(SOBAKA_USER)!) as User
  } catch {
    return null
  }
}

const writeLocalUser = (user: User) => {
  localStorage.setItem(SOBAKA_USER, JSON.stringify(user))
}
