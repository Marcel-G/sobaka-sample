import type { Meta, StoryObj } from '@storybook/svelte';
import Filter from './Filter.svelte';
import { FilterNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Helper to create a mock FilterNode without initializing the WASM node
function createMockFilterNode(frequency: number = 0.1, q: number = 0.1) {
  const node = new FilterNode('story-filter', new AudioContext(), { frequency, q }, undefined);
  return node;
}

const meta = {
  title: 'Modules/Filter',
  component: Filter,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockFilterNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Filter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowCutoff: Story = {
  args: {
    node: createMockFilterNode(0.01, 0.1),
  },
};

export const HighCutoff: Story = {
  args: {
    node: createMockFilterNode(0.9, 0.1),
  },
};

export const HighResonance: Story = {
  args: {
    node: createMockFilterNode(0.5, 4.0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
