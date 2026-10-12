/**
 * DemoNotice.tsx — the "Demo mode" explanation, written once and shown in two
 * places: the notice in Set Management's Test dataset card, and the tooltip
 * on every "Changes results" chip (see YesNo.tsx). Edit the wording here.
 */
export default function DemoNoticeText() {
  return (
    <>
      <strong>Demo mode:</strong> live SALUS runs aren't connected yet. Results are mock sample data
      (invented numbers for this prototype, not SALUS output) placed at the MSU Agronomy Farm, and the
      answers below start from the sample's settings. Only
      <strong> Irrigation</strong> changes the results; everything else is saved with the run.
    </>
  );
}
