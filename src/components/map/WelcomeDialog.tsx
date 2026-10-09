/**
 * WelcomeDialog.tsx — first-visit introduction to SALUS Online.
 *
 * Same message as the current site's welcome pop-up, restyled. It only opens
 * automatically once per browser (remembered in localStorage); the "How it
 * works" button on the map page can reopen it.
 *
 * Two ways forward: "Choose a location" (just close and start) or
 * "Show me how", which closes the dialog and starts the guided product tour
 * (`onTour`; tour content lives in src/tour/HowToTourConfig.ts).
 */
import { useColors } from '../../theme/colors';
import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography } from '@mui/material';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import TuneIcon from '@mui/icons-material/Tune';
import InsightsIcon from '@mui/icons-material/Insights';
import ExploreIcon from '@mui/icons-material/ExploreOutlined';
import { tokens } from '../../theme/tokens';

const STEPS = [
  { icon: <TouchAppIcon />, title: 'Pick your field', text: 'Click the map to choose a location. We look up its historical weather.' },
  { icon: <TuneIcon />, title: 'Describe management', text: 'Soil, tillage, hybrid, planting date, irrigation and nitrogen.' },
  { icon: <InsightsIcon />, title: 'See the results', text: 'Yield response, nitrate leaching and soil water, day by day.' },
];

export default function WelcomeDialog({ open, onClose, onTour }: { open: boolean; onClose: () => void; onTour?: () => void }) {
  const c = useColors(); // light or dark mode colours
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="welcome-title">
      {/* Banner: soft green field-stripes in place of the old farm photo */}
      <Box
        sx={{
          height: 120,
          background: `repeating-linear-gradient(100deg, ${tokens.color.spartanGreen} 0 38px, #215A4C 38px 76px)`,
          display: 'flex', alignItems: 'flex-end', p: 3,
        }}
      >
        <Typography id="welcome-title" variant="h5" component="h2" sx={{ color: '#fff' }}>
          Welcome to SALUS Online
        </Typography>
      </Box>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          Run the SALUS crop model over the web to simulate crop growth and nutrient response to your soil,
          management and local weather — and compare practices by their effect on corn yield, nitrate leaching
          and nitrogen-use efficiency.
        </Typography>
        <Stack spacing={1.5}>
          {STEPS.map((s, i) => (
            <Box key={s.title} sx={{ display: 'flex', gap: 2, alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: c.canvas, borderLeft: `4px solid ${c.stripe}` }}>
              <Box sx={{ color: 'primary.main', display: 'flex' }}>{s.icon}</Box>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{i + 1}. {s.title}</Typography>
                <Typography variant="body2" color="text.secondary">{s.text}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: 'wrap' }}>
        {onTour && (
          <Button variant="contained" color="secondary" size="large" startIcon={<ExploreIcon />} onClick={onTour}>
            Show me how
          </Button>
        )}
        <Button variant="contained" size="large" onClick={onClose}>
          Choose a location
        </Button>
      </DialogActions>
    </Dialog>
  );
}
