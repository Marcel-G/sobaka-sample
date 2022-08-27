#!/bin/sh

set -ex

# Full build

# Build type definitions for interfaces
npm run build:types

# Remove the previous build artifacts.
rm -rf dist pkg

# Create the build directory.
mkdir -p dist/src/worklet
touch dist/src/worklet/sobaka.worklet.js

# First build with dummy worklet to generate the proper WASM TypeScript definitions
npm run build:wasm

# Build the Typescript files
npm run build:tsc

# Rebuild the WASM binary, this time it includes the real sobaka.worklet.js
npm run build:wasm

cp -r pkg dist/