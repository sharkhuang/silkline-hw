import '@testing-library/jest-dom';
import { beforeAll, afterAll } from 'vitest';

// Suppress React act warnings for timer-based updates in tests
// These warnings occur because useEffect sets up timers on mount
// which is expected behavior and handled correctly by our tests
const originalStderrWrite = process.stderr.write.bind(process.stderr);

beforeAll(() => {
  process.stderr.write = (chunk: unknown, encoding?: unknown, callback?: unknown) => {
    const message = typeof chunk === 'string' ? chunk : String(chunk);
    if (
      message.includes('Warning: An update to') &&
      message.includes('was not wrapped in act')
    ) {
      // Suppress this specific warning
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    }
    return originalStderrWrite(chunk as Buffer, encoding, callback);
  };
});

afterAll(() => {
  process.stderr.write = originalStderrWrite;
});
