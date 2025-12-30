import type { Meta, StoryObj } from '@storybook/svelte';
import Noise from './Noise.svelte';
import { NoiseNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Mock AudioContext for Storybook
const mockAudioContext = new AudioContext();

// Helper to create a mock NoiseNode
function createMockNoiseNode() {
  const node = new NoiseNode('story-noise', mockAudioContext);
  return node;
}

const meta = {
  title: 'Modules/Noise',
  component: Noise,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockNoiseNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Noise>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
