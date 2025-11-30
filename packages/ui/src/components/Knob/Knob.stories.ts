import type { Meta, StoryObj } from '@storybook/svelte';
import Knob from './Knob.svelte';
import { createScaleRange, createBpmRange } from '../../range/range_creators';

const meta = {
  title: 'Components/Knob',
  component: Knob,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
} satisfies Meta<Knob>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
    label: 'Gain',
    range: createScaleRange(),
    value: 0.5,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Disabled',
    range: createScaleRange(),
    value: 0.5,
  },
};

export const BPM: Story = {
  args: {
    disabled: false,
    label: 'BPM',
    range: createBpmRange(),
    value: 120,
  },
};
