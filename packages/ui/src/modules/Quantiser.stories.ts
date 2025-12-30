import type { Meta, StoryObj } from '@storybook/svelte';
import Quantiser from './Quantiser.svelte';
import { QuantiserNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockQuantiserNode(notes?: boolean[]) {
  const node = new QuantiserNode('story-quantiser', new AudioContext(), notes ? { notes } : undefined, undefined);
  return node;
}

const meta = {
  title: 'Modules/Quantiser',
  component: Quantiser,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockQuantiserNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Quantiser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CMajorScale: Story = {
  args: {
    node: createMockQuantiserNode([
      true, false, true, false, true, true, false, true, false, true, false, true
    ]),
  },
};

export const Chromatic: Story = {
  args: {
    node: createMockQuantiserNode(Array(12).fill(true)),
  },
};

export const Pentatonic: Story = {
  args: {
    node: createMockQuantiserNode([
      true, false, true, false, true, false, false, true, false, true, false, false
    ]),
  },
};

export const Octaves: Story = {
  args: {
    node: createMockQuantiserNode([
      true, false, false, false, false, false, false, false, false, false, false, false
    ]),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
