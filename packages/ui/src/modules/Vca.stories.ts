import type { Meta, StoryObj } from '@storybook/svelte';
import Vca, { initialState } from './Vca.svelte';

const meta = {
  title: 'Modules/VCA',
  component: Vca,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Vca>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FullVolume: Story = {
  args: {
    state: { value: 1.0 },
  },
};

export const HalfVolume: Story = {
  args: {
    state: { value: 0.5 },
  },
};

export const Silent: Story = {
  args: {
    state: { value: 0 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
