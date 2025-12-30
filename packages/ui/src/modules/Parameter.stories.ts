import type { Meta, StoryObj } from '@storybook/svelte';
import Parameter from './Parameter.svelte';
import { ParameterNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockParameterNode(value: number = 0.5) {
  return new ParameterNode('story-parameter', new AudioContext(), { value }, true);
}

const meta = {
  title: 'Modules/Parameter',
  component: Parameter,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockParameterNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Parameter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Low: Story = {
  args: {
    node: createMockParameterNode(0.1),
  },
};

export const High: Story = {
  args: {
    node: createMockParameterNode(0.9),
  },
};

export const Zero: Story = {
  args: {
    node: createMockParameterNode(0.0),
  },
};

export const Max: Story = {
  args: {
    node: createMockParameterNode(1.0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
