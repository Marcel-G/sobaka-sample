import type { Meta, StoryObj } from '@storybook/svelte';
import Reverb, { initialState } from './Reverb.svelte';

const meta = {
  title: 'Modules/Reverb',
  component: Reverb,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Reverb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SmallRoom: Story = {
  args: {
    state: { mix: 0.3, time: 0.3, damping: 0.5 },
  },
};

export const LargeHall: Story = {
  args: {
    state: { mix: 0.5, time: 0.9, damping: 0.3 },
  },
};

export const Plate: Story = {
  args: {
    state: { mix: 0.4, time: 0.6, damping: 0.8 },
  },
};

export const Subtle: Story = {
  args: {
    state: { mix: 0.15, time: 0.4, damping: 0.5 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
