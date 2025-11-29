<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Knob from './Knob.svelte'
  import { create_scale_range, create_bpm_range } from '../../range/range_creators'

  export const { Story } = defineMeta({
    component: Knob,
    title: 'Components/Knob',
    tags: ['autodocs'],
    argTypes: {
      disabled: { control: 'boolean' },
      label: { control: 'text' }
    }
  })
</script>

<script>
  let gainValue = 0.5
  let disabledValue = 0.5
  let bpmValue = 120
  
  const scaleRange = create_scale_range()
  const bpmRange = create_bpm_range()
</script>

<Story name="Default">
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value={gainValue} range={scaleRange} label="Gain" disabled={false} />
  </div>
</Story>

<Story name="Disabled">
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value={disabledValue} range={scaleRange} label="Disabled" disabled={true} />
  </div>
</Story>

<Story name="BPM">
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value={bpmValue} range={bpmRange} label="BPM" disabled={false} />
  </div>
</Story>
