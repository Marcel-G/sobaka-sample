import type { Meta, StoryObj } from '@storybook/svelte';
import Delay from './Delay.svelte';
import { DelayNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Mock AudioContext for Storybook
const mockAudioContext = new AudioContext();

// Helper to create a mock DelayNode
function createMockDelayNode(delay: number = 1.0) {
  const node = new DelayNode('story-delay', mockAudioContext, { delay });
  return node;
}

const meta = {
  title: 'Modules/Delay',
  component: Delay,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockDelayNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Delay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Short: Story = {
  args: {
    node: createMockDelayNode(0.1),
  },
};

export const Long: Story = {
  args: {
    node: createMockDelayNode(2.0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
