/**
 * LabelChartFocus.tsx — gives MUI X charts' keyboard focus area a name.
 *
 * x-charts makes each chart keyboard-navigable (Tab in, then arrow keys move
 * between bars and show their tooltip), but the element that takes focus has
 * role="none" and no name, so a screen reader announces nothing useful
 * (WCAG 4.1.2). This wrapper finds that element and turns it into a named
 * group: "Soil nitrate profile chart. Use the arrow keys to read the values."
 * It re-applies the name if the chart re-renders its internals.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';

export default function LabelChartFocus({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const name = `${label} chart. Use the arrow keys to read the values.`;
    const apply = () =>
      box.querySelectorAll<HTMLElement>('[tabindex="0"][role="none"], [tabindex="0"][data-salus-chart-focus]').forEach((el) => {
        el.setAttribute('data-salus-chart-focus', '');
        if (el.getAttribute('role') !== 'group') el.setAttribute('role', 'group');
        if (el.getAttribute('aria-label') !== name) el.setAttribute('aria-label', name);
      });
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(box, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [label]);
  return <Box ref={ref}>{children}</Box>;
}
