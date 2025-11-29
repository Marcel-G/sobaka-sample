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

export const AllNotes: Story = {
  args: {
    state: { notes: Array(12).fill({ value: true }) },
  },
};

export const SomeNotes: Story = {
  args: {
    state: { notes: [
      { value: true }, { value: false }, { value: true }, { value: false },
      { value: true }, { value: true }, { value: false }, { value: true },
      { value: false }, { value: true }, { value: false }, { value: true }
    ]},
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
