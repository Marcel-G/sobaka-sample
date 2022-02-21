#!/bin/bash

# ts-rs does not expose a good way to output types that derive TS from a consumer
# So the types need to be built in the lib and copied across
# https://github.com/Aleph-Alpha/ts-rs

rm -rf ../audio-core/bindings
rm -rf bindings
(cd ../audio-core; cargo test)
cp -r ../audio-core/bindings ./