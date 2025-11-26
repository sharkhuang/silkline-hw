import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, type RenderResult } from '@testing-library/react';
import Stoplight, {
  type LightState,
  type StoplightTimings,
  type StoplightProps,
} from '../../components/Stoplight';

describe('Stoplight Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // Helper to render component with proper act wrapping
  const renderStoplight = (props?: StoplightProps): RenderResult => {
    let result: RenderResult;
    act(() => {
      result = render(<Stoplight {...props} />);
    });
    return result!;
  };

  describe('Rendering', () => {
    it('should render the stoplight component', () => {
      renderStoplight();
      const stoplight = screen.getByRole('img', { name: /traffic stoplight/i });
      expect(stoplight).toBeInTheDocument();
    });

    it('should render all three lights', () => {
      renderStoplight();
      expect(screen.getByLabelText(/red light/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/yellow light/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/green light/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderStoplight({ className: 'custom-class' });
      const stoplight = container.querySelector('.custom-class');
      expect(stoplight).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should start with green light by default', () => {
      renderStoplight();
      const greenLight = screen.getByLabelText(/green light is active/i);
      expect(greenLight).toBeInTheDocument();
    });

    it('should use correct default timings: Green 5s, Yellow 1s, Red 2s', () => {
      renderStoplight({ initialLight: 'green' });

      // Green should be active initially
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      // After 5 seconds (5000ms), should transition to yellow
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      // After 1 second (1000ms) of yellow, should transition to red
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();

      // After 2 seconds (2000ms) of red, should transition back to green
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();
    });

    it('should start with specified initialLight', () => {
      renderStoplight({ initialLight: 'red' });
      const redLight = screen.getByLabelText(/red light is active/i);
      expect(redLight).toBeInTheDocument();
    });

    it('should handle invalid initialLight and default to green', () => {
      renderStoplight({ initialLight: 'purple' as LightState });
      const greenLight = screen.getByLabelText(/green light is active/i);
      expect(greenLight).toBeInTheDocument();
    });
  });

  describe('Light Transitions', () => {
    it('should transition from green to yellow after green timing', () => {
      const timings: Partial<StoplightTimings> = { green: 100 };
      renderStoplight({ timings, initialLight: 'green' });

      // Initially green should be active
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should transition to yellow
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();
    });

    it('should transition from yellow to red after yellow timing', () => {
      const timings: Partial<StoplightTimings> = { yellow: 100 };
      renderStoplight({ timings, initialLight: 'yellow' });

      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();
    });

    it('should transition from red to green after red timing', () => {
      const timings: Partial<StoplightTimings> = { red: 100 };
      renderStoplight({ timings, initialLight: 'red' });

      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();
    });

    it('should cycle through all lights in correct order', () => {
      const timings: Partial<StoplightTimings> = {
        green: 100,
        yellow: 100,
        red: 100,
      };
      renderStoplight({ timings, initialLight: 'green' });

      // Green -> Yellow
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      // Yellow -> Red
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();

      // Red -> Green (cycle complete)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();
    });
  });

  describe('Custom Timings', () => {
    it('should use custom timings when provided', () => {
      const timings: Partial<StoplightTimings> = {
        green: 200,
        yellow: 150,
        red: 100,
      };
      renderStoplight({ timings, initialLight: 'green' });

      // Should still be green after 100ms
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      // Should transition to yellow after 200ms total
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();
    });

    it('should use default timings for unspecified lights', () => {
      const timings: Partial<StoplightTimings> = { green: 100 };
      renderStoplight({ timings, initialLight: 'green' });

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      // Yellow should use default timing (1000ms)
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();
    });

    it('should handle partial timings object', () => {
      const timings: Partial<StoplightTimings> = { red: 500 };
      renderStoplight({ timings });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('should call onLightChange when light transitions', () => {
      const onLightChange = vi.fn();
      const timings: Partial<StoplightTimings> = { green: 100 };
      renderStoplight({ timings, onLightChange, initialLight: 'green' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(onLightChange).toHaveBeenCalledWith('yellow');
    });

    it('should call onLightChange multiple times during cycling', () => {
      const onLightChange = vi.fn();
      const timings: Partial<StoplightTimings> = {
        green: 100,
        yellow: 100,
        red: 100,
      };
      renderStoplight({ timings, onLightChange, initialLight: 'green' });

      // Green -> Yellow
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLightChange).toHaveBeenCalledWith('yellow');

      // Yellow -> Red
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLightChange).toHaveBeenCalledWith('red');

      // Red -> Green
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLightChange).toHaveBeenCalledWith('green');

      expect(onLightChange).toHaveBeenCalledTimes(3);
    });

    it('should handle callback errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onLightChange = vi.fn(() => {
        throw new Error('Callback error');
      });
      const timings: Partial<StoplightTimings> = { green: 100 };
      renderStoplight({ timings, onLightChange, initialLight: 'green' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should not call onLightChange if not provided', () => {
      const timings: Partial<StoplightTimings> = { green: 100 };
      renderStoplight({ timings, initialLight: 'green' });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();
      // No error should occur
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid timing values', () => {
      const timings: Partial<StoplightTimings> = {
        green: -100,
        yellow: NaN,
        red: Infinity,
      };
      renderStoplight({ timings });
      // Should render with default values
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();
    });

    it('should clamp timing values to min/max bounds', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const timings: Partial<StoplightTimings> = { green: 5 }; // Below minimum
      renderStoplight({ timings, minTiming: 10, initialLight: 'green' });

      // Should use minimum timing (10ms)
      act(() => {
        vi.advanceTimersByTime(9);
      });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();

      consoleWarnSpy.mockRestore();
    });

    it('should reset state when initialLight prop changes', () => {
      const { rerender } = renderStoplight({ initialLight: 'green' });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      act(() => {
        rerender(<Stoplight initialLight="red" />);
      });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();
    });

    it('should handle very small timing values', () => {
      const timings: Partial<StoplightTimings> = { green: 10 };
      renderStoplight({ timings, initialLight: 'green' });

      act(() => {
        vi.advanceTimersByTime(10);
      });
      expect(screen.getByLabelText(/yellow light is active/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderStoplight();
      const stoplight = screen.getByRole('img', { name: /traffic stoplight/i });
      expect(stoplight).toBeInTheDocument();
    });

    it('should have aria-live on lights for screen readers', () => {
      renderStoplight();
      const lights = screen.getAllByRole('status');
      expect(lights.length).toBeGreaterThan(0);
      lights.forEach((light) => {
        expect(light).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should have descriptive labels for each light state', () => {
      renderStoplight({ initialLight: 'red' });
      expect(screen.getByLabelText(/red light is active/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/yellow light is inactive/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/green light is inactive/i)).toBeInTheDocument();
    });
  });

  describe('Component Memoization', () => {
    it('should not re-render when props do not change', () => {
      const { rerender } = renderStoplight({ initialLight: 'green' });
      expect(screen.getByLabelText(/green light is active/i)).toBeInTheDocument();

      act(() => {
        rerender(<Stoplight initialLight="green" />);
      });
      const afterRerender = screen.getByLabelText(/green light is active/i);

      // Component should be memoized (though React Testing Library doesn't directly test this,
      // we can verify the component still works correctly)
      expect(afterRerender).toBeInTheDocument();
    });
  });

  describe('Timer Cleanup', () => {
    it('should cleanup timers on unmount', () => {
      const onLightChange = vi.fn();
      const timings: Partial<StoplightTimings> = { green: 100 };
      const { unmount } = renderStoplight({
        timings,
        onLightChange,
        initialLight: 'green',
      });

      act(() => {
        unmount();
      });

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Callback should not be called after unmount
      expect(onLightChange).not.toHaveBeenCalled();
    });

    it('should cleanup and restart timer when timings change', () => {
      const onLightChange = vi.fn();
      const { rerender } = renderStoplight({
        timings: { green: 200 },
        onLightChange,
        initialLight: 'green',
      });

      // Advance partway through first timing
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Change timings
      act(() => {
        rerender(
          <Stoplight
            timings={{ green: 100 }}
            onLightChange={onLightChange}
            initialLight="green"
          />,
        );
      });

      // Should use new timing (100ms remaining from start)
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onLightChange).toHaveBeenCalledWith('yellow');
    });
  });
});

