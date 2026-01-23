import type { Meta, StoryObj } from '@storybook/svelte';
import Lfo from './Lfo.svelte';
import { LfoNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockLfoNode(rate: number = 1.0) {
  return new LfoNode('story-lfo', new AudioContext(), { rate }, true);
}

const meta = {
  title: 'Modules/Lfo',
  component: Lfo,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockLfoNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Lfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SlowRate: Story = {
  args: {
    node: createMockLfoNode(0.1),
  },
};

export const MediumRate: Story = {
  args: {
    node: createMockLfoNode(1.0),
  },
};

export const FastRate: Story = {
  args: {
    node: createMockLfoNode(10.0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
