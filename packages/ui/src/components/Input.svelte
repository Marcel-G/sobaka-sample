<script lang="ts">
  import { RangeType, type Range } from '../range/range'
  import { fromString, limit, toString } from '../range/rangeFunctions'

  export let value = 0.0
  export let range: Range
  export let disabled = false
  export const focus = () => {
    inputRef?.focus()
    inputRef?.select()
  }

  let inputRef: HTMLInputElement
  let isMouseDown = false

  const handleMouseDown = (_event: MouseEvent) => {
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
      } else if (range.stringMatcher?.(element.value)) {
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
      console.log('handleKeyDown', number, range, unit);
      value = limit(range, fromString(range, parseFloat(number), unit))
      console.log('handleKeyDown', value);
      element.select()
    }
  }

  const handleBlur = (event: FocusEvent) => {
    const element = event.target as HTMLInputElement
    // @todo -- doesn't seem idiomatic
    console.log('handleBlur', value);
    element.value = toString(range, value)
    console.log('handleBlur', element.value);
    isMouseDown = false
  }
</script>

<input
  bind:this={inputRef}
  type="text"
  {disabled}
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
  input[disabled] {
    user-select: none;
  }
</style>
