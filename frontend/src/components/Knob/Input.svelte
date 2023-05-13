<script lang="ts">
  import { RangeType, Range } from './range'
  import { fromString, limit, toString } from './range/rangeFunctions'

  export let value = 0.0
  export let range: Range
  export const focus = () => {
    input_ref?.focus()
    input_ref?.select()
  }

  let input_ref: HTMLInputElement
  let isMouseDown = false

  const handleMouseDown = (event: MouseEvent) => {
    isMouseDown = true
  }
  const handleMouseUp = (event: MouseEvent) => {
    const element = event.target as HTMLInputElement
    if (isMouseDown && element.selectionStart === element.selectionEnd) {
      element.select()
      isMouseDown = false
    }
  }
  const handleKeyDown = (event: KeyboardEvent) => {
    const element = event.target as HTMLInputElement

    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()

      let number: string
      let unit: string
      if (range.type === RangeType.Choice) {
        number = '0'
        unit = element.value
      } else {
        const match = element.value.match(/^-?[0-9]+(\.[0-9]+)?/g)
        if (!match) {
          return
        }
        number = match[0]
        unit = element.value.replace(number, '')
      }
      value = limit(range, fromString(range, parseFloat(number), unit))
      element.select()
    }
  }

  const handleBlur = (event: FocusEvent) => {
    const element = event.target as HTMLInputElement
    // @todo -- doesn't seem idiomatic
    element.value = toString(range, value)
    isMouseDown = false
  }
</script>

<input
  bind:this={input_ref}
  type="text"
  on:mousedown={handleMouseDown}
  on:mouseup={handleMouseUp}
  on:keydown={handleKeyDown}
  on:blur={handleBlur}
  value={toString(range, value)}
/>

<style>
  input {
    width: 100%;
    text-align: center;
    color: var(--module-foreground);
  }
</style>
