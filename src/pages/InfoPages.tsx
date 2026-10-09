/**
 * InfoPages.tsx — the simple text routes: About, Contact Us, Review.
 *
 * They share PageContainer + SectionCard so they match the rest of the app.
 * Contact and Review use MUI form inputs (Review's questions come from
 * data/ReviewFormConfig.ts); submission is stubbed (shows a
 * confirmation) until there is an endpoint to post to.
 */
import { useState, type FormEvent } from 'react';
import { Alert, Button, FormControl, FormControlLabel, FormHelperText, FormLabel, MenuItem, Radio, RadioGroup, Stack, TextField, Typography } from '@mui/material';
import { REVIEW_FORM, REVIEW_TEXT, type ReviewField } from '../data/ReviewFormConfig';
import PageContainer from '../components/layout/PageContainer';
import SectionCard from '../components/layout/SectionCard';

export function AboutPage() {
  return (
    <PageContainer title="About SALUS" maxWidth={860}>
      <SectionCard title="Systems Approach to Land Use Sustainability">
        <Typography sx={{ mb: 2 }}>
          SALUS is a process-based crop model developed in the Basso Lab at Michigan State University. It simulates
          daily crop growth, soil water and the carbon and nitrogen cycles in response to soil, weather, genetics
          and management.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          SALUS Online runs the model over the web using historical weather for the location you choose, so you can
          estimate corn yield response, nitrate leaching and nitrous-oxide emissions and compare farm practices.
        </Typography>
        <Typography>
          Results pages show the nitrate profile through 150 cm of soil, plant-extractable water and the season's
          nitrogen budget, letting you step through the simulation one day at a time.
        </Typography>
      </SectionCard>
    </PageContainer>
  );
}

/** Shared "thanks" state for the stub forms. */
function useSubmitted() {
  const [done, setDone] = useState(false);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setDone(true);
  };
  return { done, onSubmit };
}

export function ContactPage() {
  const { done, onSubmit } = useSubmitted();
  return (
    <PageContainer title="Contact Us" intro="Questions about SALUS or your results? Send the Basso Lab a note." maxWidth={720}>
      <SectionCard title="Message">
        {done ? (
          <Alert severity="success">Thanks — we'll be in touch.</Alert>
        ) : (
          <Stack component="form" spacing={2} onSubmit={onSubmit}>
            <TextField required label="Name" autoComplete="name" />
            <TextField required type="email" label="Email" autoComplete="email" />
            <TextField select label="Topic" defaultValue="results">
              <MenuItem value="results">My results</MenuItem>
              <MenuItem value="bug">Something isn't working</MenuItem>
              <MenuItem value="research">Research collaboration</MenuItem>
            </TextField>
            <TextField required multiline minRows={4} label="Message" />
            <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>Send</Button>
          </Stack>
        )}
      </SectionCard>
    </PageContainer>
  );
}

/**
 * ReviewPage — the feedback form. Every question and answer comes from
 * REVIEW_FORM in data/ReviewFormConfig.ts (edit wording/order there).
 * Drop-downs use a TextField select; one-of-a-few answers are radio buttons in
 * a named fieldset (screen readers read the question with each answer);
 * open questions are multi-line text. Sending is stubbed: it shows a thank-you.
 */
export function ReviewPage() {
  const { done, onSubmit } = useSubmitted();
  return (
    <PageContainer title={REVIEW_TEXT.title} intro={REVIEW_TEXT.intro} maxWidth={720}>
      <SectionCard title={REVIEW_TEXT.cardTitle}>
        {done ? (
          <Alert severity="success">{REVIEW_TEXT.thanks}</Alert>
        ) : (
          <Stack component="form" spacing={3} onSubmit={onSubmit}>
            {REVIEW_FORM.map((field) => (
              <ReviewQuestion key={field.id} field={field} />
            ))}
            <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}>{REVIEW_TEXT.submit}</Button>
          </Stack>
        )}
      </SectionCard>
    </PageContainer>
  );
}

/** Draws one question from the Review form config, by its kind. */
function ReviewQuestion({ field }: { field: ReviewField }) {
  if (field.kind === 'select') {
    return (
      <TextField select name={field.id} label={field.label} defaultValue={field.defaultValue ?? ''} required={field.required} helperText={field.helper}>
        {field.options.map((o) => (
          <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
        ))}
      </TextField>
    );
  }
  if (field.kind === 'choice') {
    const labelId = `review-${field.id}-label`;
    return (
      <FormControl component="fieldset" required={field.required} sx={{ m: 0 }}>
        <FormLabel component="legend" id={labelId} sx={{ color: 'text.primary', fontWeight: 600, '&.Mui-focused': { color: 'text.primary' }, mb: 0.5 }}>
          {field.label}
        </FormLabel>
        {field.helper && <FormHelperText sx={{ mx: 0, mt: 0 }}>{field.helper}</FormHelperText>}
        <RadioGroup row name={field.id} aria-labelledby={labelId}>
          {field.options.map((o) => (
            <FormControlLabel key={o.value} value={o.value} control={<Radio required={field.required} />} label={o.label} sx={{ mr: 3 }} />
          ))}
        </RadioGroup>
      </FormControl>
    );
  }
  return (
    <TextField name={field.id} multiline minRows={field.minRows ?? 4} label={field.label} placeholder={field.placeholder} required={field.required} helperText={field.helper} />
  );
}
