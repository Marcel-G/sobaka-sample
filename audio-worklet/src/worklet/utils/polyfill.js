/* eslint-disable no-undef */
import { TextEncoder, TextDecoder } from 'fastestsmallesttextencoderdecoder/EncoderDecoderTogether.min.js'

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder
}

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder
}

export function nop() {}
