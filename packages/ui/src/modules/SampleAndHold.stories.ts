import type { Meta, StoryObj } from '@storybook/svelte';
import SampleAndHold, { initialState } from './SampleAndHold.svelte';

const meta = {
  title: 'Modules/Sample & Hold',
  component: SampleAndHold,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    disabled: false,
  },
} satisfies Meta<SampleAndHold>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
