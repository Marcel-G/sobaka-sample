import { DocTypeDescription, MappedTypeDescription } from "@syncedstore/core/types/doc"
import { store as plug_store, PlugContext } from '../workspace/plugs'
import { INITIAL_STATE, ModuleUI } from "../modules"
import { svelteSyncedStore } from "@syncedstore/svelte"
import { SobakaWorkspace } from "./Workspace"
import { Readable, Writable, derived, get, writable } from "svelte/store"
import syncedStore from "@syncedstore/core"
import cloneDeep from "lodash/cloneDeep"
import { Position } from "../@types"

export interface WorkspaceDocument extends DocTypeDescription {
  metadata: {
    title: string
  }
  modules: Array<Module>
  links: Array<Required<Link>>
}

export interface Module {
  id: string
  type: ModuleUI
  state: Record<string, unknown> // Needs to be mutable from inside a module
  position: {
    x: number
    y: number
  }
}
export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: string
  // Plug ID to link to.
  to: string
}

type SyncedStore<T> = ReturnType<typeof svelteSyncedStore<T>>

export class SobakaWorkspaceStore {
  private store: SyncedStore<MappedTypeDescription<WorkspaceDocument>>
  private active_link_store: Writable<Partial<Link> | null>

  constructor(workspace: SobakaWorkspace) {
    const workpaceDoc = syncedStore<WorkspaceDocument>({
      metadata: {} as WorkspaceDocument['metadata'],
      modules: [],
      links: []
    }, workspace.doc)

    this.store = svelteSyncedStore(workpaceDoc)
    this.active_link_store = writable<Partial<Link> | null>(null)

  }

  public save_to_remote  () {
    // const cid = await _save_to_remote(doc)
    // goto(`/workspace/${cid}`)
  }

  // Module actions
  public create_module (type: ModuleUI, position: { x: number; y: number }): string {
    const id = crypto.randomUUID()

    const workspace = get(this.store)

    if (workspace.modules) {
      workspace.modules.push({
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: INITIAL_STATE[type],
        position
      })
    }

    return id
  }

  public move_module (id: string, x: number, y: number): boolean {
    const { modules } = get(this.store)
    const module = modules.find(module => module.id === id)
    if (module) {
      module.position.x = x
      module.position.y = y

      // Make the module the last in the list so that it's rendered on top.
      const index = modules.indexOf(module)
      if (index !== modules.length - 1) {
        // clone the module so it can be re-inserted without "Not supported: reassigning object that already occurs in the tree."
        // https://github.com/YousefED/SyncedStore/issues/87#issue-1487084868
        const copy = cloneDeep(module)

        modules.splice(index, 1)
        modules.push(copy)
      }
    }

    return true
  }

  public remove_module (id: string) {
    const { modules } = get(this.store)
    const index = modules.findIndex(module => module.id === id)
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  public clone_module (id: string) {
    const { modules } = get(this.store)

    const module = modules.find(module => module.id === id)

    if (module) {
      modules.push({
        ...cloneDeep(module),
        id: crypto.randomUUID(),
        position: {
          x: module.position.x + 1,
          y: module.position.y + 1
        }
      })
    }
  }

  public module_position (id: string): Readable<Position> {
    return derived(this.store, ({ modules }) => {
      const mod = modules.find(module => module.id === id)
      if (mod) {
        return mod.position
      } else {
        return { x: 0, y: 0 }
      }
    })
  }

  // Link actions
  public add_link (link: Link): string {
    const id = crypto.randomUUID()
    const { links } = get(this.store)

    links.push({ id, ...link })

    return id
  }

  public remove_link (link_id: string) {
    const { links } = get(this.store)
    const index = links.findIndex(link => link.id === link_id)
    if (index >= 0) {
      links.splice(index, 1)
    }
  }

  // Link Selectors
  public get_active_link_substore () {
    return this.active_link_store // @todo
  }

  public get_active_link_position () {
    return derived([this.get_active_link_substore(), plug_store], ([link, plugs]) => {
      if (!link || (link?.from && link?.to)) return [null, null]
      return [link.to ? plugs[link.to] : null, link.from ? plugs[link.from] : null]
    })
  }

  public get_link_positions () {
    return derived([this.store, plug_store], ([{ links }, plugs]) =>
      Object.values(links)
        .map(link => [plugs[link.to], plugs[link.from], link])
        .filter((link): link is [PlugContext, PlugContext, Required<Link>] =>
          link.every(Boolean)
        )
    )
  }
}