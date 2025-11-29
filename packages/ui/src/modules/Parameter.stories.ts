import type { Meta, StoryObj } from '@storybook/svelte';
import Parameter, { initialState } from './Parameter.svelte';

const meta = {
  title: 'Modules/Parameter',
  component: Parameter,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Parameter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Zero: Story = {
  args: {
    state: { value: 0 },
  },
};

export const Half: Story = {
  args: {
    state: { value: 0.5 },
  },
};

export const Full: Story = {
  args: {
    state: { value: 1.0 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
