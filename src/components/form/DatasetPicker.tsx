/**
 * DatasetPicker.tsx — selectable cards, one per available test dataset.
 *
 * Acts like a radio group: click a card to choose it. The chosen card gets a
 * Spartan Green border and check icon. Keyboard: cards are buttons, so Tab +
 * Enter/Space work.
 */
import { useColors } from '../../theme/colors';
import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import type { TestDataset } from '../../types';

interface Props {
  datasets: TestDataset[];
  value: string;
  onChange: (id: string) => void;
  /** 1 = stacked (narrow panels), 2 = side by side on wider screens. */
  columns?: 1 | 2;
}

export default function DatasetPicker({ datasets, value, onChange, columns = 2 }: Props) {
  const c = useColors(); // light or dark mode colours
  return (
    <Box role="radiogroup" aria-label="Test dataset" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: columns === 2 ? '1fr 1fr' : '1fr' }, gap: 1.5 }}>
      {datasets.map((d) => {
        const on = d.id === value;
        return (
          <ButtonBase
            key={d.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(d.id)}
            sx={{
              display: 'block', textAlign: 'left', p: 2, borderRadius: 2,
              border: `2px solid ${on ? c.spartanGreen : c.border}`,
              bgcolor: on ? c.surfaceGreen : c.paper,
              transition: 'all .15s',
              '&:hover': { borderColor: c.spartanGreen },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              {on ? <CheckCircleIcon sx={{ color: 'primary.main' }} /> : <RadioButtonUncheckedIcon sx={{ color: 'text.secondary' }} />}
              <Typography sx={{ fontWeight: 700, flex: 1 }}>{d.label}</Typography>
              <Chip size="small" label={`${d.firstYear}–${d.lastYear}`} sx={{ fontWeight: 600 }} />
            </Box>
            <Typography variant="body2" color="text.secondary">{d.description}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>{d.site}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
