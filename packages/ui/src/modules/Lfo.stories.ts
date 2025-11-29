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
    state: { bpm: 60 },
  },
};

export const Fast: Story = {
  args: {
    state: { bpm: 180 },
  },
};

export const Medium: Story = {
  args: {
    state: { bpm: 120 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
