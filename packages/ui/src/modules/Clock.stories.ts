import type { Meta, StoryObj } from '@storybook/svelte';
import Clock from './Clock.svelte';
import { ClockNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Helper to create a mock ClockNode without initializing the WASM node
function createMockClockNode(bpm: number = 120) {
  const node = new ClockNode('story-clock', new AudioContext(), { bpm }, undefined);
  return node;
}

const meta = {
  title: 'Modules/Clock',
  component: Clock,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockClockNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Clock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Slow: Story = {
  args: {
    node: createMockClockNode(60),
  },
};

export const Fast: Story = {
  args: {
    node: createMockClockNode(180),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
