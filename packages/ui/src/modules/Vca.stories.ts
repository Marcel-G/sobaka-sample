import type { Meta, StoryObj } from '@storybook/svelte';
import Vca from './Vca.svelte';
import { VcaNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockVcaNode(value: number = 0.5) {
  const node = new VcaNode('story-vca', new AudioContext(), { value }, undefined);
  return node;
}

const meta = {
  title: 'Modules/Vca',
  component: Vca,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockVcaNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Vca>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowGain: Story = {
  args: {
    node: createMockVcaNode(0.1),
  },
};

export const HighGain: Story = {
  args: {
    node: createMockVcaNode(0.9),
  },
};

export const Unity: Story = {
  args: {
    node: createMockVcaNode(0.5),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
