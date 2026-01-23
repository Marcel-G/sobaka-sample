import type { Meta, StoryObj } from '@storybook/svelte';
import Euclidean from './Euclidean.svelte';
import { EuclideanNode } from '@sobaka/dsp';
import { writable } from 'svelte/store';

function createMockEuclideanNode(steps = 8, fills = 3, rotation = 0) {
  return new EuclideanNode('story-euclidean', new AudioContext(), {
    steps,
    fills,
    rotation,
  }, true);
}

const meta = {
  title: 'Modules/Euclidean',
  component: Euclidean,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
  },
  args: {
    node: createMockEuclideanNode(),
    disabled: false,
    position: writable({ x: 0, y: 0 }),
  },
} satisfies Meta<Euclidean>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Tresillo: Story = {
  args: {
    node: createMockEuclideanNode(8, 3, 0),
  },
};

export const Cinquillo: Story = {
  args: {
    node: createMockEuclideanNode(8, 5, 0),
  },
};

export const FourOnFloor: Story = {
  args: {
    node: createMockEuclideanNode(4, 4, 0),
  },
};

export const Complex: Story = {
  args: {
    node: createMockEuclideanNode(16, 7, 0),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
