import type { Meta, StoryObj } from '@storybook/svelte';
import Lfo, { initialState } from './Lfo.svelte';

const meta = {
  title: 'Modules/LFO',
  component: Lfo,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Lfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Slow: Story = {
  args: {
    state: { frequency: 0.5, shape: 0 },
  },
};

export const Fast: Story = {
  args: {
    state: { frequency: 10, shape: 0 },
  },
};

export const Saw: Story = {
  args: {
    state: { frequency: 2, shape: 1 },
  },
};

export const Square: Story = {
  args: {
    state: { frequency: 2, shape: 2 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
