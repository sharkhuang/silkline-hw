import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Represents the possible states of a stoplight light
 */
export type LightState = 'red' | 'yellow' | 'green';

/**
 * Timing configuration for each light in milliseconds
 */
export interface StoplightTimings {
  green: number;
  yellow: number;
  red: number;
}

/**
 * Props for the Stoplight component
 */
export interface StoplightProps {
  /** Custom timings for each light in milliseconds */
  timings?: Partial<StoplightTimings>;
  /** Initial light state */
  initialLight?: LightState;
  /** Additional CSS classes for the container */
  className?: string;
  /** Callback when light changes */
  onLightChange?: (light: LightState) => void;
  /** Minimum timing value in milliseconds (default: 10ms) */
  minTiming?: number;
  /** Maximum timing value in milliseconds (default: 2147483647ms ~24.8 days) */
  maxTiming?: number;
}

/**
 * Props for individual light component
 */
interface LightProps {
  /** The light state (color) */
  state: LightState;
  /** Whether this light is currently active */
  isActive: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default timings based on requirements: Green 5s, Yellow 1s, Red 2s */
const DEFAULT_TIMINGS: StoplightTimings = {
  green: 5000,
  yellow: 1000,
  red: 2000,
};

/** Maximum safe value for setTimeout (2^31 - 1 milliseconds) */
const MAX_SAFE_TIMEOUT = 2_147_483_647;

/** Minimum safe timing value in milliseconds */
const MIN_SAFE_TIMING = 10;

/** Valid light states array for validation */
const VALID_LIGHT_STATES: readonly LightState[] = ['red', 'yellow', 'green'] as const;

/** Light sequence order */
const LIGHT_SEQUENCE: readonly LightState[] = ['green', 'yellow', 'red'] as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validates and normalizes timing values to ensure they are within safe bounds
 *
 * @param value - The timing value to normalize
 * @param defaultValue - Default value to use if value is invalid
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Normalized timing value
 */
const normalizeTiming = (
  value: number | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return defaultValue;
  }
  return Math.max(min, Math.min(max, Math.floor(value)));
};

/**
 * Validates that a light state is one of the valid states
 *
 * @param light - The light state to validate
 * @param defaultLight - Default light state to return if invalid
 * @returns Valid light state
 */
const validateLightState = (light: unknown, defaultLight: LightState): LightState => {
  return VALID_LIGHT_STATES.includes(light as LightState) ? (light as LightState) : defaultLight;
};

/**
 * Merges partial timings with default values, normalizing all values
 *
 * @param partialTimings - Partial timing configuration
 * @param defaults - Default timing values
 * @param minTiming - Minimum timing value
 * @param maxTiming - Maximum timing value
 * @returns Complete normalized timing configuration
 */
const mergeTimings = (
  partialTimings: Partial<StoplightTimings> | undefined,
  defaults: StoplightTimings,
  minTiming: number,
  maxTiming: number,
): StoplightTimings => {
  return {
    green: normalizeTiming(partialTimings?.green, defaults.green, minTiming, maxTiming),
    yellow: normalizeTiming(partialTimings?.yellow, defaults.yellow, minTiming, maxTiming),
    red: normalizeTiming(partialTimings?.red, defaults.red, minTiming, maxTiming),
  };
};

/**
 * Gets the next light in the sequence
 *
 * @param currentLight - The current active light
 * @returns The next light state in sequence
 */
const getNextLight = (currentLight: LightState): LightState => {
  const currentIndex = LIGHT_SEQUENCE.indexOf(currentLight);
  const nextIndex = (currentIndex + 1) % LIGHT_SEQUENCE.length;
  return LIGHT_SEQUENCE[nextIndex];
};

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual light component for the stoplight
 * Memoized to prevent unnecessary re-renders
 */
const Light = memo<LightProps>(({ state, isActive }) => {
  const baseClasses =
    'w-24 h-24 rounded-full border-4 border-gray-900 transition-all duration-300';
  const activeClasses: Record<LightState, string> = {
    red: 'bg-red-500 shadow-[0_0_30px_15px_rgba(239,68,68,0.6)]',
    yellow: 'bg-yellow-400 shadow-[0_0_30px_15px_rgba(250,204,21,0.6)]',
    green: 'bg-green-500 shadow-[0_0_30px_15px_rgba(34,197,94,0.6)]',
  };
  const inactiveClasses: Record<LightState, string> = {
    red: 'bg-red-900 opacity-30',
    yellow: 'bg-yellow-900 opacity-30',
    green: 'bg-green-900 opacity-30',
  };

  const className = `${baseClasses} ${isActive ? activeClasses[state] : inactiveClasses[state]}`;

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label={isActive ? `${state} light is active` : `${state} light is inactive`}
    />
  );
});

Light.displayName = 'Light';

// ============================================================================
// Main Component
// ============================================================================

/**
 * Validates props in development mode for better developer experience
 */
const validateProps = (props: StoplightProps): void => {
  // Use Vite's import.meta.env.DEV instead of process.env for browser compatibility
  if (!import.meta.env.DEV) {
    return;
  }

  if (props.timings) {
    Object.entries(props.timings).forEach(([key, value]) => {
      if (value !== undefined && (typeof value !== 'number' || value < 0)) {
        console.warn(
          `Stoplight: Invalid timing value for ${key}: ${value}. Expected a non-negative number.`,
        );
      }
    });
  }

  if (props.minTiming !== undefined && props.minTiming < 0) {
    console.warn(
      `Stoplight: minTiming must be non-negative, got ${props.minTiming}.`,
    );
  }

  if (props.maxTiming !== undefined && props.maxTiming < 0) {
    console.warn(
      `Stoplight: maxTiming must be non-negative, got ${props.maxTiming}.`,
    );
  }

  if (
    props.minTiming !== undefined &&
    props.maxTiming !== undefined &&
    props.minTiming > props.maxTiming
  ) {
    console.warn(
      `Stoplight: minTiming (${props.minTiming}) should be less than or equal to maxTiming (${props.maxTiming}).`,
    );
  }
};

/**
 * Stoplight component that cycles through red, yellow, and green lights
 * with configurable timing for each state.
 *
 * @example
 * ```tsx
 * <Stoplight
 *   timings={{ green: 5000, yellow: 1000, red: 2000 }}
 *   onLightChange={(light) => console.log(`Light changed to ${light}`)}
 * />
 * ```
 */
const Stoplight = memo<StoplightProps>(
  ({
    timings,
    initialLight = 'green',
    className = '',
    onLightChange,
    minTiming = MIN_SAFE_TIMING,
    maxTiming = MAX_SAFE_TIMEOUT,
  }) => {
    // Validate props in development mode
    validateProps({ timings, initialLight, className, onLightChange, minTiming, maxTiming });
    // Normalize and validate props
    const normalizedTimings = useMemo(
      () => mergeTimings(timings, DEFAULT_TIMINGS, minTiming, maxTiming),
      [timings, minTiming, maxTiming],
    );

    const validatedInitialLight = useMemo(
      () => validateLightState(initialLight, 'green'),
      [initialLight],
    );

    const [activeLight, setActiveLight] = useState<LightState>(validatedInitialLight);
    const onLightChangeRef = useRef(onLightChange);

    // Keep callback ref up to date without causing re-renders
    useEffect(() => {
      onLightChangeRef.current = onLightChange;
    }, [onLightChange]);

    // Reset state when initialLight prop changes
    useEffect(() => {
      setActiveLight(validatedInitialLight);
    }, [validatedInitialLight]);

    // Stable callback for light transitions
    const handleLightTransition = useCallback(() => {
      setActiveLight((prevLight) => {
        const nextLight = getNextLight(prevLight);

        // Safely call callback with error handling
        try {
          onLightChangeRef.current?.(nextLight);
        } catch (error) {
          console.error('Stoplight: Error in onLightChange callback:', error);
        }

        return nextLight;
      });
    }, []);

    // Manage the cycling timer
    useEffect(() => {
      const currentTiming = normalizedTimings[activeLight];

      // normalizedTimings already validates and clamps values, so this check is redundant
      // Timer will always be valid at this point
      const timer = setTimeout(handleLightTransition, currentTiming);

      return () => {
        clearTimeout(timer);
      };
    }, [activeLight, normalizedTimings, handleLightTransition]);

    // Build container className - template literal handles spacing correctly
    const containerClassName = className
      ? `bg-gray-800 p-6 rounded-lg shadow-2xl ${className}`
      : 'bg-gray-800 p-6 rounded-lg shadow-2xl';

    return (
      <div className={containerClassName} role="img" aria-label="Traffic stoplight">
        <div className="flex flex-col gap-4 bg-gray-700 p-4 rounded-lg">
          <Light state="red" isActive={activeLight === 'red'} />
          <Light state="yellow" isActive={activeLight === 'yellow'} />
          <Light state="green" isActive={activeLight === 'green'} />
        </div>
      </div>
    );
  },
);

Stoplight.displayName = 'Stoplight';

export default Stoplight;

