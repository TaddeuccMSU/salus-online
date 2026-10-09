/**
 * FormSection.tsx — one numbered card of the Set Management form.
 *
 * The number badge + title echo the "Key design decisions" cards from the
 * Spartan White concept (green left rule). `id` lets the side nav scroll here.
 */
import { useColors } from '../../theme/colors';
import type { FocusEvent } from 'react';
import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

interface Props {
  id: string;
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Keyboard users: when focus moves INTO a section with Tab, scroll the whole
 * card into view (heading, help text, control and its labels), not just the
 * focused control. Otherwise e.g. Tab onto the year slider only showed the
 * thin slider track, hidden under the panel's footer. Cards taller than the
 * panel just keep the focused control in view.
 */
function revealOnKeyboardFocus(e: FocusEvent<HTMLElement>) {
  const target = e.target as HTMLElement;
  if (!target.matches(':focus-visible')) return; // mouse clicks don't scroll
  if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return; // already inside this card
  const card = e.currentTarget;
  const scroller = card.closest<HTMLElement>('[data-form-scroller]');
  const fits = !scroller || card.offsetHeight <= scroller.clientHeight - 32;
  const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  (fits ? card : target).scrollIntoView({ block: 'nearest', behavior });
}

export default function FormSection({ id, step, title, description, children }: Props) {
  const c = useColors(); // light or dark mode colours
  return (
    <Paper
      id={id}
      data-tour={`panel-${id}`}
      component="section"
      // A named group: screen readers say "Simulation period, group" on entering it.
      role="group"
      aria-labelledby={`${id}-title`}
      onFocus={revealOnKeyboardFocus}
      sx={{ p: { xs: 2, md: 2.5 }, scrollMarginTop: 16, borderLeft: `4px solid ${c.stripe}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: description ? 0.5 : 2 }}>
        <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: c.surfaceGreen, color: 'primary.main', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: '0.875rem' }}>
          {step}
        </Box>
        <Typography variant="h6" component="h2" id={`${id}-title`}>{title}</Typography>
      </Box>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, ml: '44px' }}>{description}</Typography>
      )}
      <Stack spacing={2.5}>{children}</Stack>
    </Paper>
  );
}
