/**
 * GoalFilter.tsx — the "Filter results:" toggles (Best Agronomic / Best
 * Economic / Best Environmental, green / blue / red). Any combination can be
 * on; the parent shades the winning values. Used by the Results summary table
 * and the Compare runs dialog.
 */
import { Box, ToggleButton, ToggleButtonGroup, Typography, type SxProps, type Theme } from '@mui/material';
import { useId } from 'react';
import { GOALS, type GoalKey } from './summaryShared';

interface Props {
  value: GoalKey[];
  onChange: (v: GoalKey[]) => void;
  sx?: SxProps<Theme>;
}

export default function GoalFilter({ value, onChange, sx }: Props) {
  const labelId = useId();
  return (
    <Box sx={[{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Typography id={labelId} variant="body2" sx={{ fontWeight: 600 }}>Filter results:</Typography>
      <ToggleButtonGroup
        size="small" value={value} aria-labelledby={labelId} sx={{ flexWrap: 'wrap', gap: 0.5 }}
        onChange={(_, v: GoalKey[]) => onChange(GOALS.map((g) => g.key).filter((k) => v.includes(k)))}
      >
        {GOALS.map((g) => (
          <ToggleButton
            key={g.key} value={g.key}
            sx={{
              gap: 0.75,
              '&.Mui-selected, &.Mui-selected:hover': { bgcolor: g.color, borderColor: g.color, color: '#fff' },
              // the theme's ✓ on selected toggles; the colour dot is enough here
              '&.Mui-selected::before': { display: 'none' },
            }}
          >
            <Box component="span" aria-hidden sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: g.color, border: '1.5px solid #fff', flexShrink: 0 }} />
            {g.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
