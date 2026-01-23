/**
 * DSP Package Entry Point
 * 
 * Exports core types, graph management, and node classes.
 * App is responsible for creating plugin registry with UI components.
 */

// Core types and utilities
export * from './shared'

// Graph management (includes ModuleFactory interface)
export * from './graph'

// Node classes (for type references and plugin definitions)
export * from './module'
