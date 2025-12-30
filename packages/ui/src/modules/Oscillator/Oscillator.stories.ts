import type { Meta, StoryObj } from '@storybook/svelte';
import Oscillator from './Oscillator.svelte';
import { OscillatorNode } from '@sobaka/dsp';
import { OscillatorShape } from '@sobaka/dsp/wasm';
import { writable } from 'svelte/store';

// Mock AudioContext for Storybook
const mockAudioContext = new AudioContext();

// Helper to create a mock OscillatorNode
function createMockOscillatorNode(pitch: number = 1.0, shape: OscillatorShape = OscillatorShape.Saw) {
  const node = new OscillatorNode('story-oscillator', mockAudioContext, { pitch, shape });
  return node;
}

const meta = {
  title: 'Modules/Oscillator',
  component: Oscillator,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockOscillatorNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Oscillator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sine: Story = {
  args: {
    node: createMockOscillatorNode(1.0, OscillatorShape.Sine),
  },
};

export const Square: Story = {
  args: {
    node: createMockOscillatorNode(1.0, OscillatorShape.Square),
  },
};

export const Triangle: Story = {
  args: {
    node: createMockOscillatorNode(1.0, OscillatorShape.Triangle),
  },
};

export const Saw: Story = {
  args: {
    node: createMockOscillatorNode(1.0, OscillatorShape.Saw),
  },
};

export const HighPitch: Story = {
  args: {
    node: createMockOscillatorNode(2.0, OscillatorShape.Saw),
  },
};

export const LowPitch: Story = {
  args: {
    node: createMockOscillatorNode(0.5, OscillatorShape.Saw),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
