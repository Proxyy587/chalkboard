"use client";

import { useEffect } from "react";

/**
 * Run once after mount. Escape hatch for external sync (e.g. localStorage).
 * Prefer derived state, event handlers, or a data library when possible.
 */
export function useMountEffect(effect: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only by design
  useEffect(effect, []);
}
