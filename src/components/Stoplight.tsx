import { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the Stoplight component
 */
export interface StoplightProps {
  /** Array of colors for each light (CSS color values: hex, rgb, or named colors). Default: 3 lights (yellow, red, green) */
  colors?: string[];
  /** Array of timings for each light in milliseconds (optional, defaults to 1000ms for each) */
  timings?: number[];
  /** Array of light indices to include in the sequence (optional, defaults to all lights bottom-to-top) */
  sequence?: number[];
  /** Initial light index (0-based, must be in sequence if provided) */
  initialLight?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Callback when light changes (receives the new light index) */
  onLightChange?: (lightIndex: number) => void;
  /** Minimum timing value in milliseconds (default: 10ms) */
  minTiming?: number;
  /** Maximum timing value in milliseconds (default: 2147483647ms ~24.8 days) */
  maxTiming?: number;
}

/**
 * Props for individual light component
 */
interface LightProps {
  /** The light index */
  index: number;
  /** Whether this light is currently active */
  isActive: boolean;
  /** The color for this light (CSS color value) */
  color: string;
}

// ============================================================================
// Constants
// ============================================================================


/** Default timing in milliseconds */
const DEFAULT_TIMING = 1000;

/** Maximum safe value for setTimeout (2^31 - 1 milliseconds) */
const MAX_SAFE_TIMEOUT = 2_147_483_647;

/** Minimum safe timing value in milliseconds */
const MIN_SAFE_TIMING = 10;

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
 * Validates and normalizes the colors array
 *
 * @param colors - Array of color strings
 * @returns Normalized colors array (default: yellow, red, green)
 */
const normalizeColors = (colors: string[] | undefined): string[] => {
  if (!Array.isArray(colors) || colors.length === 0) {
    // Default: 3 lights - yellow, red, green (top to bottom)
    return ['#facc15', '#ef4444', '#22c55e']; // yellow, red, green
  }
  // Filter out invalid colors, no limit on number of lights
  return colors.filter((color) => typeof color === 'string');
};

/**
 * Validates and normalizes the timings array
 *
 * @param timings - Array of timing values
 * @param numLights - Number of lights
 * @param minTiming - Minimum timing value
 * @param maxTiming - Maximum timing value
 * @returns Normalized timings array
 */
const normalizeTimings = (
  timings: number[] | undefined,
  numLights: number,
  minTiming: number,
  maxTiming: number,
): number[] => {
  if (!Array.isArray(timings)) {
    return Array(numLights).fill(DEFAULT_TIMING);
  }
  // Fill missing timings with default, limit to number of lights
  const normalized: number[] = [];
  for (let i = 0; i < numLights; i++) {
    normalized.push(
      normalizeTiming(timings[i], DEFAULT_TIMING, minTiming, maxTiming),
    );
  }
  return normalized;
};

/**
 * Validates light index
 *
 * @param index - The light index to validate
 * @param maxIndex - Maximum valid index
 * @param defaultIndex - Default index to return if invalid
 * @returns Valid light index
 */
const validateLightIndex = (
  index: number | undefined,
  maxIndex: number,
  defaultIndex: number,
): number => {
  if (typeof index !== 'number' || Number.isNaN(index) || !Number.isFinite(index)) {
    return defaultIndex;
  }
  const clamped = Math.floor(index);
  if (clamped < 0 || clamped > maxIndex) {
    return defaultIndex;
  }
  return clamped;
};

/**
 * Normalizes and validates the sequence array
 * Preserves all entries including duplicates to allow custom sequences
 *
 * @param sequence - Array of light indices to include in sequence (can contain duplicates)
 * @param maxIndex - Maximum valid light index
 * @returns Normalized sequence array (defaults to all indices bottom-to-top)
 */
const normalizeSequence = (
  sequence: number[] | undefined,
  maxIndex: number,
): number[] => {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    // Default: all lights in reverse order (bottom to top)
    // For 3 lights (0=yellow, 1=red, 2=green): [2, 1, 0]
    const defaultSeq: number[] = [];
    for (let i = maxIndex; i >= 0; i--) {
      defaultSeq.push(i);
    }
    return defaultSeq;
  }
  // Filter and validate indices, preserving duplicates and order
  const validIndices = sequence
    .filter(
      (idx) =>
        typeof idx === 'number' &&
        Number.isFinite(idx) &&
        idx >= 0 &&
        idx <= maxIndex,
    )
    .map((idx) => Math.floor(idx));
  // If no valid indices, return default
  return validIndices.length > 0 ? validIndices : [maxIndex];
};


// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual light component for the stoplight
 * Memoized to prevent unnecessary re-renders
 */
const Light = memo<LightProps>(({ index, isActive, color }) => {
  const baseClasses =
    'w-24 h-24 rounded-full border-4 border-gray-900 transition-all duration-300';

  // Convert color to rgba for shadow effect
  const getShadowColor = (colorValue: string, alpha: number): string => {
    // Handle hex colors
    if (colorValue.startsWith('#')) {
      const r = parseInt(colorValue.slice(1, 3), 16);
      const g = parseInt(colorValue.slice(3, 5), 16);
      const b = parseInt(colorValue.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    // Handle rgb colors
    if (colorValue.startsWith('rgb(')) {
      return colorValue.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
    }
    // Handle rgba colors - replace alpha
    if (colorValue.startsWith('rgba(')) {
      return colorValue.replace(
        /rgba\(([^,]+),([^,]+),([^,]+),([^)]+)\)/,
        `rgba($1,$2,$3,${alpha})`,
      );
    }
    // For named colors, try to convert (fallback to original color with opacity)
    // This is a simplified approach - for production, consider using a color library
    return colorValue;
  };

  const opacityClass = isActive ? 'opacity-100' : 'opacity-30';
  const className = `${baseClasses} ${opacityClass}`;

  const shadowStyle = isActive
    ? { boxShadow: `0 0 30px 15px ${getShadowColor(color, 0.6)}` }
    : {};

  return (
    <div
      className={className}
      style={{ backgroundColor: color, ...shadowStyle }}
      role="status"
      aria-live="polite"
      aria-label={
        isActive ? `Light ${index + 1} is active` : `Light ${index + 1} is inactive`
      }
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

  if (!Array.isArray(props.colors) || props.colors.length === 0) {
    console.warn(
      'Stoplight: colors must be a non-empty array of color strings.',
    );
  }


  if (props.colors) {
    props.colors.forEach((color, index) => {
      if (typeof color !== 'string') {
        console.warn(
          `Stoplight: Invalid color at index ${index}: ${color}. Expected a CSS color string (hex, rgb, or named color).`,
        );
      }
    });
  }

  if (props.timings) {
    props.timings.forEach((timing, index) => {
      if (typeof timing !== 'number' || timing < 0) {
        console.warn(
          `Stoplight: Invalid timing at index ${index}: ${timing}. Expected a non-negative number.`,
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

  if (props.sequence) {
    if (!Array.isArray(props.sequence)) {
      console.warn('Stoplight: sequence must be an array of numbers.');
    } else {
      props.sequence.forEach((idx, pos) => {
        const maxIndex = (props.colors?.length ?? 3) - 1;
        if (typeof idx !== 'number' || idx < 0 || idx > maxIndex) {
          console.warn(
            `Stoplight: Invalid sequence index at position ${pos}: ${idx}. Must be between 0 and ${maxIndex}.`,
          );
        }
      });
    }
  }

  const defaultNumLights = 3;
  const numLights = props.colors?.length ?? defaultNumLights;
  if (
    props.initialLight !== undefined &&
    (props.initialLight < 0 || props.initialLight >= numLights)
  ) {
    console.warn(
      `Stoplight: initialLight (${props.initialLight}) is out of range. Should be between 0 and ${numLights - 1}.`,
    );
  }
};

/**
 * Stoplight component that cycles through configurable number of lights
 * with configurable timing, colors, and sequence for each light.
 * Default: 3 lights (yellow, red, green).
 *
 * @example
 * ```tsx
 * <Stoplight
 *   colors={['#ff0000', '#ffff00', '#00ff00']}
 *   timings={[5000, 1000, 2000]}
 *   sequence={[2, 1, 0]} // Only cycle through lights at indices 2, 1, 0
 *   onLightChange={(index) => console.log(`Light changed to index ${index}`)}
 * />
 * ```
 */
const Stoplight = memo<StoplightProps>(
  ({
    colors,
    timings,
    sequence,
    initialLight,
    className = '',
    onLightChange,
    minTiming = MIN_SAFE_TIMING,
    maxTiming = MAX_SAFE_TIMEOUT,
  }) => {
    // Validate props in development mode
    validateProps({ colors, timings, sequence, initialLight, className, onLightChange, minTiming, maxTiming });

    // Normalize colors and determine number of lights
    const normalizedColors = useMemo(() => normalizeColors(colors), [colors]);
    const numLights = normalizedColors.length;
    const maxLightIndex = numLights - 1;

    // Normalize sequence (defaults to all lights bottom-to-top)
    const normalizedSequence = useMemo(
      () => normalizeSequence(sequence, maxLightIndex),
      [sequence, maxLightIndex],
    );

    // Normalize timings
    const normalizedTimings = useMemo(
      () => normalizeTimings(timings, numLights, minTiming, maxTiming),
      [timings, numLights, minTiming, maxTiming],
    );

    // Validate and normalize initial light index
    // Default to first light in sequence (which is the last index in default bottom-to-top order)
    const defaultInitialLight = normalizedSequence[0];
    const validatedInitialLight = useMemo(() => {
      const validated = validateLightIndex(initialLight, maxLightIndex, defaultInitialLight);
      // If initialLight is provided but not in sequence, use first in sequence
      if (initialLight !== undefined && !normalizedSequence.includes(validated)) {
        return defaultInitialLight;
      }
      return validated;
    }, [initialLight, maxLightIndex, defaultInitialLight, normalizedSequence]);

    // Compute initial sequence position
    const initialSequencePosition = useMemo(() => {
      const pos = normalizedSequence.indexOf(validatedInitialLight);
      return pos >= 0 ? pos : 0;
    }, [validatedInitialLight, normalizedSequence]);

    // Track current position in sequence array to handle duplicates correctly
    const [sequencePosition, setSequencePosition] = useState<number>(initialSequencePosition);
    const activeLightIndex = normalizedSequence[sequencePosition];
    const onLightChangeRef = useRef(onLightChange);

    // Keep callback ref up to date without causing re-renders
    useEffect(() => {
      onLightChangeRef.current = onLightChange;
    }, [onLightChange]);

    // Create a stable key for the sequence to detect changes
    const sequenceKey = useMemo(
      () => normalizedSequence.join(',') + `:${initialSequencePosition}`,
      [normalizedSequence, initialSequencePosition],
    );

    // Reset state when sequence or initial position changes
    // This is necessary to reset the sequence position when props change
    useEffect(() => {
      setSequencePosition(initialSequencePosition);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sequenceKey]);

    // Stable callback for light transitions
    const handleLightTransition = useCallback(() => {
      setSequencePosition((prevPos) => {
        // Move to next position in sequence, cycling to start if at end
        const nextPos = (prevPos + 1) % normalizedSequence.length;
        const nextIndex = normalizedSequence[nextPos];

        // Safely call callback with error handling
        try {
          onLightChangeRef.current?.(nextIndex);
        } catch (error) {
          console.error('Stoplight: Error in onLightChange callback:', error);
        }

        return nextPos;
      });
    }, [normalizedSequence]);

    // Manage the cycling timer
    // Use sequencePosition as dependency to ensure timer resets even when light index is the same
    useEffect(() => {
      const currentTiming = normalizedTimings[activeLightIndex];

      // normalizedTimings already validates and clamps values, so this check is redundant
      // Timer will always be valid at this point
      const timer = setTimeout(handleLightTransition, currentTiming);

      return () => {
        clearTimeout(timer);
      };
    }, [sequencePosition, activeLightIndex, normalizedTimings, handleLightTransition]);

    // Build container className - template literal handles spacing correctly
    const containerClassName = className
      ? `bg-gray-800 p-6 rounded-lg shadow-2xl ${className}`
      : 'bg-gray-800 p-6 rounded-lg shadow-2xl';

    return (
      <div className={containerClassName} role="img" aria-label="Traffic stoplight">
        <div className="flex flex-col gap-4 bg-gray-700 p-4 rounded-lg">
          {normalizedColors.map((color, index) => (
            <Light
              key={index}
              index={index}
              isActive={activeLightIndex === index}
              color={color}
            />
          ))}
        </div>
      </div>
    );
  },
);

Stoplight.displayName = 'Stoplight';

export default Stoplight;
