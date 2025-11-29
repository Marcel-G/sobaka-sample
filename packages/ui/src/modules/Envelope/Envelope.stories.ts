import type { Meta, StoryObj } from '@storybook/svelte';
import Envelope, { initialState } from './Envelope.svelte';

const meta = {
  title: 'Modules/Envelope',
  component: Envelope,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    state: initialState,
    disabled: false,
  },
} satisfies Meta<Envelope>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pluck: Story = {
  args: {
    state: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
  },
};

export const Pad: Story = {
  args: {
    state: { attack: 0.5, decay: 0.3, sustain: 0.7, release: 1.0 },
  },
};

export const Percussive: Story = {
  args: {
    state: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 },
  },
};

export const Organ: Story = {
  args: {
    state: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.01 },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
