import type { Meta, StoryObj } from '@storybook/svelte';
import Noise, { initialState } from './Noise.svelte';

const meta = {
  title: 'Modules/Noise',
  component: Noise,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<Noise>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
