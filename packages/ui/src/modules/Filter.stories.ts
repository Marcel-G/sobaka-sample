import type { Meta, StoryObj } from '@storybook/svelte';
import Filter, { initialState } from './Filter.svelte';

const meta = {
  title: 'Modules/Filter',
  component: Filter,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Filter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LowFrequency: Story = {
  args: {
    state: { frequency: 0.1, q: 0.5 },
  },
};

export const MidFrequency: Story = {
  args: {
    state: { frequency: 0.5, q: 0.5 },
  },
};

export const HighFrequency: Story = {
  args: {
    state: { frequency: 0.9, q: 0.5 },
  },
};

export const HighResonance: Story = {
  args: {
    state: { frequency: 0.5, q: 0.9 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
