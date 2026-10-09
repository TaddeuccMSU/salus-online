/**
 * WizardStepper.tsx — the "1 Select field · 2 Set Management · 3 Results"
 * progress bar shown on the map page and (after a new run) on the results page.
 *
 * `active` is the 0-based current step. Earlier steps show a check and, if
 * `onStepClick` is given, are clickable so users can jump back.
 *
 * Follows the chrome colour scheme (white-on-green in the green variant).
 *
 * Phones (≤ 600 px wide) get a condensed single-row version: small icons,
 * and only the current step shows its name (others are just the numbered
 * or checked dot), so the bar is about 36 px tall instead of about 70.
 *
 * Dismissable: the ✕ at the right hides the bar (remembered in this browser,
 * hooks/useStepsBar.ts); top-bar ⚙ Settings → "Steps bar" brings it back.
 * Hiding it announces where to get it back and moves keyboard focus to the
 * page heading, so focus isn't lost with the button.
 */
import { useColors } from '../../theme/colors';
import { Box, IconButton, Paper, Step, StepButton, StepLabel, Stepper, Tooltip, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useStepsBar } from '../../hooks/useStepsBar';
import { useAnnounce } from '../../state/AnnouncerContext';
import { srOnly } from '../../theme/a11y';
import { tokens } from '../../theme/tokens';
import { ChromeSurface, GREEN_ACCENT, useChrome } from '../../theme/chrome';

export const WIZARD_STEPS = ['Select field', 'Set Management', 'Results'] as const;

interface Props {
  active: number;
  onStepClick?: (index: number) => void;
}

export default function WizardStepper({ active, onStepClick }: Props) {
  const c = useColors(); // light or dark mode colours
  const condensed = useMediaQuery('(max-width:600px)');
  const green = useChrome().variant === 'green';
  const [shown, setShown] = useStepsBar();
  const announce = useAnnounce();
  if (!shown) return null;

  /** ✕: hide the bar, say how to get it back, and put focus on the page heading. */
  const hide = () => {
    setShown(false);
    announce('Steps bar hidden. Turn it back on in Settings.');
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('main h1, main h2, #main');
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus();
      }
    });
  };

  return (
    <ChromeSurface>
    <Paper square sx={{ position: 'relative', border: 'none', borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Tooltip title="Hide the steps bar (bring it back in Settings)">
        <IconButton
          onClick={hide}
          aria-label="Hide the steps bar"
          size="small"
          sx={{ position: 'absolute', right: { xs: 4, sm: 12 }, top: '50%', transform: 'translateY(-50%)', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Box sx={{ maxWidth: 720, mx: 'auto', px: condensed ? 5 : 2, py: condensed ? 0.75 : 1.25 }}>
        <Stepper
          activeStep={active}
          alternativeLabel={!condensed}
          sx={{
            '& .MuiStepIcon-root.Mui-completed': { color: green ? GREEN_ACCENT : c.kellyGreen },
            '& .MuiStepIcon-root.Mui-active': { color: green ? '#fff' : c.spartanGreen },
            ...(green && {
              '& .MuiStepIcon-root': { color: 'rgba(255,255,255,0.35)' },
              '& .MuiStepIcon-root.Mui-active .MuiStepIcon-text': { fill: tokens.color.spartanGreen },
              '& .MuiStepLabel-label, & .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed': { color: '#fff' },
              '& .MuiStepConnector-line': { borderColor: 'rgba(255,255,255,0.3)' },
            }),
            '& .MuiStepLabel-label': condensed
              ? { fontWeight: 700, fontSize: '0.75rem' }
              : { fontWeight: 600, mt: '6px !important' },
            ...(condensed && {
              '& .MuiStepIcon-root': { fontSize: 20 },
              '& .MuiStepLabel-iconContainer': { pr: 0.75 },
              '& .MuiStep-root': { px: 0.5 },
              '& .MuiStepConnector-root': { mx: 0.5 },
            }),
          }}
        >
          {WIZARD_STEPS.map((label, i) => {
            // Condensed: name only the current step on screen; the others are dots.
            // Screen readers always hear the step name and whether it's done or current.
            const state = i < active ? ', done' : i === active ? ', current step' : '';
            const content = (
              <>
                {condensed && i !== active ? <Box component="span" sx={srOnly}>{label}</Box> : label}
                <Box component="span" sx={srOnly}>{state}</Box>
              </>
            );
            return (
              <Step key={label} completed={i < active}>
                {onStepClick && i < active ? (
                  <StepButton onClick={() => onStepClick(i)}>{content}</StepButton>
                ) : (
                  <StepLabel>{content}</StepLabel>
                )}
              </Step>
            );
          })}
        </Stepper>
      </Box>
    </Paper>
    </ChromeSurface>
  );
}
