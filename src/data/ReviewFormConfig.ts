/**
 * ReviewFormConfig.ts — every question and answer on the Review page.
 *
 * The Review page (pages/InfoPages.tsx → ReviewPage) draws its form entirely
 * from REVIEW_FORM below, in order, so questions can be reworded, reordered,
 * added or removed here without touching the page. The rating questions come
 * from the live SALUS Online site's review form.
 *
 * Field kinds:
 *  - 'select'  a drop-down (e.g. "I am a…"); `defaultValue` is pre-picked
 *  - 'choice'  one answer from a short list, shown as radio buttons in a row
 *  - 'text'    open, multi-line text entry
 *
 * Each field's `id` is the key its answer is stored under when the form is
 * submitted (submission is stubbed until there is an endpoint to post to).
 */

/** One answer the user can pick. `value` is what gets stored; `label` is shown. */
export interface ReviewOption {
  value: string;
  label: string;
}

interface BaseField {
  /** Key the answer is saved under (keep stable once a backend stores answers). */
  id: string;
  /** The question as shown on the page. */
  label: string;
  /** Optional smaller help text under the question. */
  helper?: string;
  /** Must be answered before the form can be sent. */
  required?: boolean;
}

export interface SelectField extends BaseField {
  kind: 'select';
  options: ReviewOption[];
  defaultValue?: string;
}

export interface ChoiceField extends BaseField {
  kind: 'choice';
  options: ReviewOption[];
}

export interface ReviewTextField extends BaseField {
  kind: 'text';
  /** Height of the box in lines. */
  minRows?: number;
  placeholder?: string;
}

export type ReviewField = SelectField | ChoiceField | ReviewTextField;

/** Answer scales shared by several questions. */
const AGREEMENT: ReviewOption[] = [
  { value: 'very', label: 'Very' },
  { value: 'mostly', label: 'Mostly' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'not-at-all', label: 'Not at all' },
];
const QUALITY: ReviewOption[] = [
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];
const YES_NO: ReviewOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

/** The Review page's heading text and button labels. */
export const REVIEW_TEXT = {
  title: 'Review',
  intro: 'Tell us how SALUS Online worked for you.',
  cardTitle: 'Your feedback',
  submit: 'Submit review',
  thanks: 'Thank you for the feedback!',
};

/** The form, top to bottom. */
export const REVIEW_FORM: ReviewField[] = [
  {
    id: 'role',
    kind: 'select',
    label: 'I am a…',
    defaultValue: 'farmer',
    options: [
      { value: 'farmer', label: 'Farmer / grower' },
      { value: 'advisor', label: 'Crop advisor' },
      { value: 'student', label: 'Student / educator' },
      { value: 'researcher', label: 'Researcher' },
    ],
  },
  {
    id: 'believable',
    kind: 'choice',
    label: 'How believable do you find the outcomes shown on SALUS Online?',
    options: AGREEMENT,
  },
  {
    id: 'useful',
    kind: 'choice',
    label: 'How useful do you believe this website would be in providing information for you about nitrogen management and factors affecting your yields?',
    options: AGREEMENT,
  },
  {
    id: 'overall',
    kind: 'choice',
    label: 'Overall, how would you rate SALUS Online?',
    options: QUALITY,
  },
  {
    id: 'wouldUse',
    kind: 'choice',
    label: 'Would you use SALUS Online to help make decisions about your nitrogen management?',
    options: YES_NO,
  },
  {
    id: 'improve',
    kind: 'text',
    label: 'What could be better?',
    minRows: 4,
  },
];
