#!/bin/sh

set -ex

# Full build

# Remove the previous build artifacts.
rm -rf dist pkg

# Build type definitions for interfaces
npm run build:types

# Rebuild the WASM binary
npm run build:wasm

# Build special bundle for worklet code
npm run build:worklet

# Build the Typescript files
npm run build:tsc

# Remove worklet folder to avoid confusion
rm -rf dist/src/worklet
