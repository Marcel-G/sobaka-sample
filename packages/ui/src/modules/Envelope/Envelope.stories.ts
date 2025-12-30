import type { Meta, StoryObj } from '@storybook/svelte';
import Envelope from './Envelope.svelte';
import { EnvelopeNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Mock AudioContext for Storybook
const mockAudioContext = new AudioContext();

// Helper to create a mock EnvelopeNode
function createMockEnvelopeNode(attack: number = 0.1, release: number = 0.1) {
  const node = new EnvelopeNode('story-envelope', mockAudioContext, { attack, release });
  return node;
}

const meta = {
  title: 'Modules/Envelope',
  component: Envelope,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockEnvelopeNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Envelope>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FastAttack: Story = {
  args: {
    node: createMockEnvelopeNode(0.01, 0.1),
  },
};

export const SlowRelease: Story = {
  args: {
    node: createMockEnvelopeNode(0.1, 1.0),
  },
};

export const Percussive: Story = {
  args: {
    node: createMockEnvelopeNode(0.001, 0.05),
  },
};

export const Pad: Story = {
  args: {
    node: createMockEnvelopeNode(0.5, 2.0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
