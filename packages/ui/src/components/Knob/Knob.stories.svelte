<script context="module">
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import Knob from './Knob.svelte'
  import { create_scale_range, create_bpm_range } from '../../range/range_creators'

  const { Story } = defineMeta({
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
  let value = 0.5
  const scaleRange = create_scale_range()
  const bpmRange = create_bpm_range()
</script>

<Story name="Default" args={{ disabled: false, label: 'Gain' }}>
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value range={scaleRange} label="Gain" disabled={false} />
  </div>
</Story>

<Story name="Disabled" args={{ disabled: true, label: 'Disabled' }}>
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value range={scaleRange} label="Disabled" disabled={true} />
  </div>
</Story>

<Story name="BPM" args={{ disabled: false, label: 'BPM' }}>
  <div style="padding: 2rem; background: #1a1a1a;">
    <Knob bind:value={120} range={bpmRange} label="BPM" disabled={false} />
  </div>
</Story>
