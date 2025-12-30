import type { Meta, StoryObj } from '@storybook/svelte';
import Reverb from './Reverb.svelte';
import { ReverbNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Helper to create a mock ReverbNode without initializing the WASM node
function createMockReverbNode() {
  const node = new ReverbNode('story-reverb', new AudioContext(), {}, undefined);
  return node;
}

const meta = {
  title: 'Modules/Reverb',
  component: Reverb,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockReverbNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Reverb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
