import type { Meta, StoryObj } from '@storybook/svelte';
import Lfo from './Lfo.svelte';
import { LfoNode, LfoShape } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockLfoNode(rate: number = 1.0, shape: LfoShape = LfoShape.Sine) {
  return new LfoNode('story-lfo', new AudioContext(), { rate, shape }, true);
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

export const Sine: Story = {
  args: {
    node: createMockLfoNode(1.0, LfoShape.Sine),
  },
};

export const Triangle: Story = {
  args: {
    node: createMockLfoNode(1.0, LfoShape.Triangle),
  },
};

export const Square: Story = {
  args: {
    node: createMockLfoNode(1.0, LfoShape.Square),
  },
};

export const Saw: Story = {
  args: {
    node: createMockLfoNode(1.0, LfoShape.Saw),
  },
};

export const ReverseSaw: Story = {
  args: {
    node: createMockLfoNode(1.0, LfoShape.ReverseSaw),
  },
};

export const SlowRate: Story = {
  args: {
    node: createMockLfoNode(0.1, LfoShape.Sine),
  },
};

export const FastRate: Story = {
  args: {
    node: createMockLfoNode(10.0, LfoShape.Sine),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
