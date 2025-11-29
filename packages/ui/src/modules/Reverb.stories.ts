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
    state: { wet: 0.3, length: 0.3 },
  },
};

export const LargeHall: Story = {
  args: {
    state: { wet: 0.5, length: 0.9 },
  },
};

export const Plate: Story = {
  args: {
    state: { wet: 0.4, length: 0.6 },
  },
};

export const Subtle: Story = {
  args: {
    state: { wet: 0.15, length: 0.4 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
