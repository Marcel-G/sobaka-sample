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

export const LowPass: Story = {
  args: {
    state: { cutoff: 1000, resonance: 0.5, type: 0 },
  },
};

export const HighPass: Story = {
  args: {
    state: { cutoff: 1000, resonance: 0.5, type: 1 },
  },
};

export const BandPass: Story = {
  args: {
    state: { cutoff: 1000, resonance: 0.5, type: 2 },
  },
};

export const HighResonance: Story = {
  args: {
    state: { cutoff: 1000, resonance: 0.9, type: 0 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
