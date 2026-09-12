import type { KeyboardEvent } from 'react';

/**
 * Stops Enter from implicitly submitting a multi-field form. Without this,
 * pressing Enter in any text input (e.g. to move on, or to trigger a field's
 * own Enter behavior like a CEP lookup) fires the form's submit handler early.
 * Textareas are exempt so Enter still inserts a newline there.
 */
export function preventEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== 'Enter') return;
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  e.preventDefault();
}
