/**
 * ChartDataTable.tsx — the "Table" view of a results chart: the same numbers
 * as a real HTML table, for screen-reader users, keyboard users and anyone
 * who wants exact values (WCAG 1.1.1, 1.3.1). Chosen per chart in its
 * ⚙ Chart settings ("View: Chart / Table").
 *
 * Columns are headers (th scope=col); the first cell of each row is the row's
 * header (th scope=row). A caption names the table and the date. Long tables
 * (the events list) scroll inside the card with a sticky header row.
 */
import { useColors } from '../../theme/colors';
import type { ReactNode } from 'react';
import { srOnly } from '../../theme/a11y';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

export interface DataColumn {
  label: string;
  /** Numbers line up on the right. */
  numeric?: boolean;
}

interface Props {
  caption: string;
  columns: DataColumn[];
  rows: ReactNode[][];
  /** Shown when there are no rows. */
  empty?: string;
  maxHeight?: number;
}

export default function ChartDataTable({ caption, columns, rows, empty = 'No data for this period.', maxHeight = 380 }: Props) {
  const pal = useColors(); // light or dark mode colours
  return (
    <TableContainer sx={{ maxHeight, border: 1, borderColor: 'divider', borderRadius: 1.5 }} tabIndex={0} role="region" aria-label={caption}>
      <Table size="small" stickyHeader>
        {/* Read by screen readers; on screen the card title already names the table */}
        <Box component="caption" sx={srOnly}>{caption}</Box>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.label} scope="col" align={c.numeric ? 'right' : 'left'} sx={{ fontWeight: 700, bgcolor: pal.raised }}>{c.label}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? rows.map((r, i) => (
            <TableRow key={i} hover>
              {r.map((cell, j) => (
                <TableCell key={j} component={j === 0 ? 'th' : 'td'} scope={j === 0 ? 'row' : undefined} align={columns[j]?.numeric ? 'right' : 'left'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          )) : (
            <TableRow><TableCell colSpan={columns.length}><Typography variant="body2" color="text.secondary">{empty}</Typography></TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
