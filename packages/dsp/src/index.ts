/**
 * DSP Package Entry Point
 * 
 * Exports plugin system, core types, and node classes.
 * App is responsible for creating registry and registering plugins.
 */

// Core types and utilities
export * from './shared'
export * from './graph'

// Plugin system
export {
  PluginRegistry,
  definePlugin,
  type ModulePlugin,
  type ModuleComponent,
  type ModuleCategory,
  type BaseModuleProps,
} from './plugin'

// Node classes (for type references and plugin definitions)
export * from './module'
