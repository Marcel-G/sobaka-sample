import type { Meta, StoryObj } from '@storybook/svelte';
import SampleAndHold from './SampleAndHold.svelte';
import { SampleAndHoldNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockSampleAndHoldNode() {
  const node = new SampleAndHoldNode('story-sample-and-hold', new AudioContext(), {}, undefined);
  return node;
}

const meta = {
  title: 'Modules/SampleAndHold',
  component: SampleAndHold,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockSampleAndHoldNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<SampleAndHold>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
