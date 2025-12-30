import type { Meta, StoryObj } from '@storybook/svelte';
import Mixer from './Mixer.svelte';
import { MixerDSP } from '@sobaka/dsp';
import { writable } from 'svelte/store';

// Mock AudioContext for Storybook
const mockAudioContext = new AudioContext();

// Helper to create a mock MixerDSP
function createMockMixerNode(volume: number = 0.7, muted: boolean = false) {
  const node = new MixerDSP('story-mixer', mockAudioContext, { volume, muted });
  return node;
}

const meta = {
  title: 'Modules/Mixer',
  component: Mixer,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockMixerNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Mixer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Quiet: Story = {
  args: {
    node: createMockMixerNode(0.3, false),
  },
};

export const Loud: Story = {
  args: {
    node: createMockMixerNode(1.0, false),
  },
};

export const Muted: Story = {
  args: {
    node: createMockMixerNode(0.7, true),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
