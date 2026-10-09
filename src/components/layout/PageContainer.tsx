/**
 * PageContainer.tsx — centred, padded content column for non-map pages.
 * Optional `title`/`intro` render a consistent page heading; `title` also
 * becomes the browser tab title ("My Runs · SALUS Online").
 */
import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { usePageTitle } from '../../state/AnnouncerContext';

interface Props {
  title?: string;
  intro?: ReactNode;
  actions?: ReactNode;
  maxWidth?: number;
  children: ReactNode;
}

export default function PageContainer({ title, intro, actions, maxWidth = 1200, children }: Props) {
  usePageTitle(title); // browser tab title follows the page heading (WCAG 2.4.2)
  return (
    <Box sx={{ width: '100%', maxWidth, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 4 } }}>
      {(title || actions) && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 2, mb: 3 }}>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            {title && <Typography variant="h4" component="h1">{title}</Typography>}
            {intro && <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 760 }}>{intro}</Typography>}
          </Box>
          {actions}
        </Box>
      )}
      {children}
    </Box>
  );
}
