/**
 * SectionCard.tsx — the white rounded card used everywhere in Spartan White.
 *
 * Props:
 *  - `title`    small all-caps label (e.g. "SOIL NITRATE PROFILE")
 *  - `subtitle` units/context on a full-width line under the title row
 *  - `action`   optional element pinned top-right (a value, a button…)
 *  - `legend`   optional legend row under the subtitle
 *  - `tourId`   optional `data-tour` id so the product tour can spotlight it
 *  - `handle`   optional drag handle shown before the title (results cards)
 */
import type { ReactNode } from 'react';
import { Box, Paper, Typography, type SxProps, type Theme } from '@mui/material';

interface Props {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  sx?: SxProps<Theme>;
  tourId?: string;
  handle?: ReactNode;
}

export default function SectionCard({ title, subtitle, action, legend, children, sx, tourId, handle }: Props) {
  return (
    <Paper data-tour={tourId} sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: 'column', minWidth: 0, ...sx }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        {handle && <Box sx={{ mr: -1.5, mt: -0.25 }}>{handle}</Box>}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="overline" component="h2" sx={{ display: 'block', color: 'primary.main' }}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      {/* Subtitle on its own full-width line under the header row, so the
          width of the corner controls / live headline number never squeezes
          or re-wraps it (e.g. while the date plays). */}
      {subtitle && (
        <Typography variant="caption" color="text.secondary" component="div">
          {subtitle}
        </Typography>
      )}
      {legend && <Box sx={{ mt: 0.75 }}>{legend}</Box>}
      {/* minHeight auto: the card grows to fit everything (chart + summary line) */}
      <Box sx={{ flex: 1, minHeight: 'auto', mt: 1 }}>{children}</Box>
    </Paper>
  );
}
