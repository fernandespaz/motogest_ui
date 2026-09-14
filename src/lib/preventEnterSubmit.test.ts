import type { KeyboardEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { preventEnterSubmit } from './preventEnterSubmit';

function fakeEvent(key: string, tagName: string) {
  return {
    key,
    target: { tagName },
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLFormElement>;
}

describe('preventEnterSubmit', () => {
  it('prevents the default submit when Enter is pressed in a non-textarea field', () => {
    const event = fakeEvent('Enter', 'INPUT');
    preventEnterSubmit(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('lets Enter insert a newline in a textarea', () => {
    const event = fakeEvent('Enter', 'TEXTAREA');
    preventEnterSubmit(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores every other key', () => {
    const event = fakeEvent('a', 'INPUT');
    preventEnterSubmit(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
