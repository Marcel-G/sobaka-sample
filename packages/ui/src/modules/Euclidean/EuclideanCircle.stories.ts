import type { Meta, StoryObj } from '@storybook/svelte';
import EuclideanCircle from './EuclideanCircle.svelte';
import { computeEuclideanPattern } from '@sobaka/dsp';

/**
 * The EuclideanCircle component visualizes a Euclidean rhythm pattern
 * as a circle with steps arranged around the perimeter.
 * 
 * - Active steps (triggers) are shown as filled circles
 * - Inactive steps are shown as hollow circles
 * - Current step is highlighted with a ring
 */
const meta = {
  title: 'Components/EuclideanCircle',
  component: EuclideanCircle,
  tags: ['autodocs'],
  argTypes: {
    steps: { 
      control: { type: 'range', min: 1, max: 16, step: 1 },
    },
    currentStep: { 
      control: { type: 'range', min: 0, max: 15, step: 1 },
    },
    size: { 
      control: { type: 'range', min: 40, max: 150, step: 10 },
    },
  },
  args: {
    steps: 8,
    pattern: computeEuclideanPattern(8, 3, 0),
    currentStep: 0,
    size: 80,
  },
  decorators: [
    () => ({
      Component: undefined,
      props: {},
      template: `
        <div style="background: var(--color-pink-dark, #3d2040); padding: 2rem; display: inline-block; border-radius: 8px; --color-module-accent: var(--color-pink, #ff69b4); --color-light: #e0e0e0; --color-dark: #1a1a1a;">
          <story />
        </div>
      `
    })
  ]
} satisfies Meta<EuclideanCircle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Standard 3-in-8 pattern - classic Tresillo rhythm */
export const Tresillo: Story = {
  args: {
    steps: 8,
    pattern: computeEuclideanPattern(8, 3, 0),
    currentStep: 0,
  },
};

/** 5-in-8 pattern - Cinquillo rhythm */
export const Cinquillo: Story = {
  args: {
    steps: 8,
    pattern: computeEuclideanPattern(8, 5, 0),
    currentStep: 3,
  },
};

/** 7-in-16 pattern */
export const Complex: Story = {
  args: {
    steps: 16,
    pattern: computeEuclideanPattern(16, 7, 0),
    currentStep: 8,
    size: 100,
  },
};

/** 4-in-4 pattern - Four on the floor */
export const FourOnFloor: Story = {
  args: {
    steps: 4,
    pattern: computeEuclideanPattern(4, 4, 0),
    currentStep: 0,
    size: 60,
  },
};

/** With rotation applied */
export const WithRotation: Story = {
  args: {
    steps: 8,
    pattern: computeEuclideanPattern(8, 3, 2),
    currentStep: 5,
  },
};
