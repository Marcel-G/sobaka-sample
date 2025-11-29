import type { Meta, StoryObj } from '@storybook/svelte';
import Oscillator, { initialState } from './Oscillator.svelte';

const meta = {
  title: 'Modules/Oscillator',
  component: Oscillator,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Oscillator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sine: Story = {
  args: {
    state: { pitch: 0, shape: 0 },
  },
};

export const Saw: Story = {
  args: {
    state: { pitch: 0, shape: 1 },
  },
};

export const Square: Story = {
  args: {
    state: { pitch: 0, shape: 2 },
  },
};

export const Triangle: Story = {
  args: {
    state: { pitch: 0, shape: 3 },
  },
};

export const HighPitch: Story = {
  args: {
    state: { pitch: 2, shape: 0 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
