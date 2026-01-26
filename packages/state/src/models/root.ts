import syncedStore from '@syncedstore/core'
import { type Readable } from 'svelte/store'
import * as Y from 'yjs'
import { WorkspaceList } from './workspaceList.ts'
import { type SubDocReference } from '../util/subdoc.ts'
import { intoReadable } from '../util/store.ts'
import { SyncedDoc, SyncedDocFactory, GLOBAL_INTRO_LIST_UUID, type Config } from './syncedDoc.ts'
import type { Workspace } from './workspace.ts'

// Re-export for convenience
export { GLOBAL_INTRO_LIST_UUID }

type RootStore = {
  workspaceLists: SubDocReference<WorkspaceList>[]
}

export interface GlobalContext {
  workspaces: SyncedDocFactory<Workspace>
  lists: SyncedDocFactory<WorkspaceList>
}

const ROOT_STORE_SHAPE = {
  workspaceLists: []
}

/**
 * Top level document storage for a user.
 * 
 * Each user has their own root document (UUID = user's identity).
 * The root contains workspace lists in a specific order:
 * 
 * - workspaceLists[0]: Global "Intro" list (GLOBAL_INTRO_LIST_UUID)
 *   - Visible to all users (readonly for non-admins)
 *   - Contains showcase workspaces
 * 
 * - workspaceLists[1]: User's "My Workspaces" list
 *   - Personal workspace list
 *   - Fully editable by the user
 * 
 * - workspaceLists[2+]: Additional lists (shared lists, etc.)
 */
export class Root extends SyncedDoc<'root'> {
  private store: ReturnType<typeof syncedStore<RootStore>>

  constructor(doc: Y.Doc, config: Config) {
    super('root', doc, config)
    this.store = syncedStore(ROOT_STORE_SHAPE, doc)
  }

  static fromRef(ref: SubDocReference<Root>, config: Config) {
    return new Root(new Y.Doc({ guid: ref.guid }), config)
  }

  /**
   * Migrate the root document to ensure it has required structure.
   * 
   * Ensures:
   * - workspaceLists[0]: Always the global intro list (GLOBAL_INTRO_LIST_UUID)
   * - workspaceLists[1]: User's personal "My Workspaces" list
   * - No duplicate references exist
   * 
   * This handles CRDT merge scenarios where syncing with persistence
   * could result in duplicate global list references.
   */
  migrate(ctx: GlobalContext) {
    const globalListRef = { guid: GLOBAL_INTRO_LIST_UUID } as SubDocReference<WorkspaceList>
    
    // First, remove ALL global list references from positions 1+
    // This cleans up duplicates that may have been created by CRDT merges
    // Iterate backwards to avoid index shifting issues
    for (let i = this.store.workspaceLists.length - 1; i >= 1; i--) {
      if (this.store.workspaceLists.at(i)?.guid === GLOBAL_INTRO_LIST_UUID) {
        this.store.workspaceLists.splice(i, 1)
      }
    }
    
    // Check if global list is at position 0
    const currentFirst = this.store.workspaceLists.at(0)
    
    if (!currentFirst) {
      // No lists yet - add global list at position 0
      this.store.workspaceLists.splice(0, 0, globalListRef)
    } else if (currentFirst.guid !== GLOBAL_INTRO_LIST_UUID) {
      // Position 0 has something else - check if global list exists anywhere
      // (it shouldn't after the cleanup above, but handle edge cases)
      const existingGlobalIndex = this.store.workspaceLists.findIndex(
        ref => ref.guid === GLOBAL_INTRO_LIST_UUID
      )
      
      if (existingGlobalIndex === -1) {
        // Global list doesn't exist - insert at position 0 (pushes others down)
        this.store.workspaceLists.splice(0, 0, globalListRef)
      }
      // If it exists at position 0, we're good (shouldn't happen given our check)
    }

    // Ensure user's personal list is at position 1
    // Don't create a new one if position 1 already has something
    if (!this.store.workspaceLists.at(1)) {
      const userList = ctx.lists.get()
      userList.create(this.config.currentUser, 'My Workspaces')
      this.store.workspaceLists.splice(1, 0, userList.intoRef())
    }
  }

  /**
   * Get the global intro list reference (position 0)
   */
  globalList(): SubDocReference<WorkspaceList> {
    const globalList = this.store.workspaceLists.at(0)
    if (!globalList) {
      throw new Error('Global list not found - call migrate() first')
    }
    return globalList
  }

  /**
   * Get the user's personal list reference (position 1)
   */
  userList(): SubDocReference<WorkspaceList> {
    const userList = this.store.workspaceLists.at(1)
    if (!userList) {
      throw new Error('User list not found - call migrate() first')
    }
    return userList
  }

  /**
   * Add a new list to the root (position 2+)
   */
  addList(list: WorkspaceList) {
    this.store.workspaceLists.push(list.intoRef())
  }

  /**
   * Get all workspace list references
   */
  workspaceLists(): Readable<SubDocReference<WorkspaceList>[]> {
    return intoReadable(this.store.workspaceLists)
  }

  /**
   * Check if this is a valid admin who can edit global lists
   */
  canEditGlobalLists(): boolean {
    // This is determined by the signaling server based on JWT role
    // The actual enforcement happens at the persistence/sync layer
    return false // UI should check via Global.isAdmin
  }
}
