import type { Meta, StoryObj } from '@storybook/svelte';
import Delay, { initialState } from './Delay.svelte';

const meta = {
  title: 'Modules/Delay',
  component: Delay,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Delay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Short: Story = {
  args: {
    state: { time: 0.1 },
  },
};

export const Long: Story = {
  args: {
    state: { time: 1.0 },
  },
};

export const Medium: Story = {
  args: {
    state: { time: 0.5 },
  },
};

export const Slapback: Story = {
  args: {
    state: { time: 0.15 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
