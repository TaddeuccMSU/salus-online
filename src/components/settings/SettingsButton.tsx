/**
 * SettingsButton.tsx — a ⚙ button that opens a small settings pop-over.
 *
 * Used on every results chart ("Chart settings": colours + units) and on the
 * Set Management panel ("Form settings": units). Put setting sections inside
 * as children (e.g. <UnitsSetting/>, colour controls). Adding a new kind of
 * setting later = another section, no new buttons.
 *
 * The pop-over always uses the base theme (light, or dark in dark mode), even when the button sits
 * on a green bar, so its controls stay readable.
 */
import { useState, type ReactNode } from 'react';
import { Box, IconButton, Popover, Tooltip, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useAppTheme } from '../../theme/chrome';

interface Props {
  /** Small all-caps label at the top, e.g. "Chart settings". */
  title: string;
  /** What the settings apply to, e.g. "Soil water". */
  subject: string;
  /** Tooltip on the button. */
  tooltip: string;
  /** data-tour id, so the product tour can point at this button. */
  tourId?: string;
  /** Button icon (default ⚙) and size; header buttons use a bigger, darker one. */
  icon?: ReactNode;
  size?: 'small' | 'medium';
  color?: string;
  children: ReactNode;
}

export default function SettingsButton({ title, subject, tooltip, tourId, icon, size = 'small', color = 'text.secondary', children }: Props) {
  const theme = useAppTheme(); // light or dark base theme (never a green bar's)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Tooltip title={tooltip}>
        <IconButton
          size={size}
          data-tour={tourId}
          aria-label={`${title}: ${subject}`}
          aria-haspopup="dialog"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ color, '&:hover': { color: 'primary.main' } }}
        >
          {icon ?? <SettingsOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <ThemeProvider theme={theme}>
        <Popover
          open={!!anchor}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { role: 'dialog', 'aria-label': `${title}: ${subject}`, sx: { width: 330, maxWidth: 'calc(100vw - 24px)', p: 2, bgcolor: 'background.paper', color: 'text.primary' } } }}
        >
          <Typography variant="overline" sx={{ color: 'primary.main', display: 'block', lineHeight: 1.4 }}>{title}</Typography>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{subject}</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>{children}</Box>
        </Popover>
      </ThemeProvider>
    </>
  );
}

/** Section heading inside a settings pop-over. */
export function SettingsSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Box component="section">
      <Typography variant="body2" sx={{ fontWeight: 700, mb: note ? 0.25 : 0.75 }}>{title}</Typography>
      {note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>{note}</Typography>}
      {children}
    </Box>
  );
}
