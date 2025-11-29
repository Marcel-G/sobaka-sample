import type { Meta, StoryObj } from '@storybook/svelte';
import Clock, { initialState } from './Clock.svelte';

const meta = {
  title: 'Modules/Clock',
  component: Clock,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Clock>;

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

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
