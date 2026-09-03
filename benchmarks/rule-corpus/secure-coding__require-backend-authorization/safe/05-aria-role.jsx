/**
 * SAFE - NOMINAL CONTROL. `role` is the ARIA role of a DOM node. This is a
 * keyboard-navigation helper in a design system; it has no authorisation
 * semantics at all, and `role` is one of the most common property names in any
 * accessible React codebase.
 */
import React from 'react';

export function useRovingFocus(element) {
  if (element.role === 'menuitem') {
    element.tabIndex = -1;
  }

  return React.useCallback(() => element.focus(), [element]);
}
