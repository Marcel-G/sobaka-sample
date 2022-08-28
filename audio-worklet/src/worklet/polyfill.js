/* eslint-disable no-undef */
import {
  TextEncoder,
  TextDecoder
} from 'fastestsmallesttextencoderdecoder/EncoderDecoderTogether.min.js'

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder
}

if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder
}

// https://gist.github.com/lukaslihotzki/b50ccb61ff3a44b48fc4d5ed7e54303f
if (globalThis.Worklet) {
  const wrappedFunc = Worklet.prototype.addModule

  Worklet.prototype.addModule = async function (url) {
    try {
      return await wrappedFunc.call(this, url)
    } catch (e) {
      if (e.name != 'AbortError') {
        rethrow
      }
      // assume error is caused by https://bugzilla.mozilla.org/show_bug.cgi?id=1572644
      console.warn('direct addModule call failed, resorting to bundling')
      const { rollup } = await import(
        'https://unpkg.com/rollup@2.78.0/dist/es/rollup.browser.js'
      )
      const generated = await (
        await rollup({
          input: url,
          onwarn: console.warn,
          plugins: [
            {
              resolveId(importee, importer) {
                return new URL(
                  importee,
                  new URL(importer || window.location.href)
                ).toString()
              },
              load(id) {
                return fetch(id).then(response => response.text())
              }
            }
          ]
        })
      ).generate({})
      const blob = new Blob([generated.output[0].code], { type: 'text/javascript' })
      const objectUrl = URL.createObjectURL(blob)
      try {
        return await wrappedFunc.call(this, objectUrl)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }
}
export function nop() {}
