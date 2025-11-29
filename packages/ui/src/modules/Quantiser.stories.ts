import type { Meta, StoryObj } from '@storybook/svelte';
import Quantiser, { initialState } from './Quantiser.svelte';

const meta = {
  title: 'Modules/Quantiser',
  component: Quantiser,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Quantiser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Chromatic: Story = {
  args: {
    state: { scale: 0 },
  },
};

export const Major: Story = {
  args: {
    state: { scale: 1 },
  },
};

export const Minor: Story = {
  args: {
    state: { scale: 2 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
