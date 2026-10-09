/**
 * SortableCardGrid.tsx — lays out the results chart cards and lets users
 * re-order them by dragging a card's ⠿ handle (mouse, touch or keyboard).
 *
 * LAYOUT. Cards are placed in order, row by row (with Large text, one card
 * fewer per row until the screen is very wide):
 *   - a `wide` card (the events timeline) always gets a full row;
 *   - other cards share rows: up to 3 per row on large screens, 2 on medium,
 *     1 on phones. Within a row each card's width follows its `weight`
 *     (e.g. the narrow soil-water gauge gets less room), and a row with fewer
 *     cards stretches them to fill it, so moving a card never leaves gaps.
 * It's one CSS grid of 60 columns; each card spans its share of 60 (gutters
 * come from padding on the cards, not grid gaps). Cards are
 * never re-mounted when the order changes (charts don't flicker or reset).
 *
 * DRAGGING (dnd-kit, MIT). Only the handle starts a drag, so charts keep their
 * own clicks, hovers and drags. While dragging, a small "ghost" of the card
 * follows the pointer, the card being moved is dimmed, and the card it will
 * land next to shows a green insertion bar. Drop → the layout re-flows.
 * Keyboard: Tab to a handle, Space to pick up, arrow keys to move,
 * Space/Enter to drop, Esc to cancel; screen readers hear what's happening.
 *
 * NO DRAG NEEDED (WCAG 2.5.7): clicking or tapping the handle (or Enter on it)
 * opens a small menu: Move up, Move down, Move to top, Move to bottom.
 */
import { useColors } from '../../theme/colors';
import { useState, type ReactNode } from 'react';
import { Box, IconButton, Menu, MenuItem, Paper, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useAnnounce } from '../../state/AnnouncerContext';
import { useTextSize } from '../../state/TextSizeContext';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent, type Announcements,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { tokens } from '../../theme/tokens';

const COLS = 60;

export interface GridCard {
  id: string;
  title: string;
  /** Takes a whole row (e.g. a timeline). */
  wide?: boolean;
  /** Relative width when sharing a row (default 1). */
  weight?: number;
  /** Draws the card; put `handle` somewhere in its header. */
  render: (handle: ReactNode) => ReactNode;
}

/** Column span (out of 60) for every card, given the order and cards per row. */
export function layoutSpans(cards: GridCard[], perRow: number): Map<string, number> {
  const spans = new Map<string, number>();
  let row: GridCard[] = [];
  const flush = () => {
    const total = row.reduce((s, c) => s + (c.weight ?? 1), 0);
    let used = 0;
    row.forEach((c, i) => {
      const span = i === row.length - 1 ? COLS - used : Math.round((COLS * (c.weight ?? 1)) / total);
      spans.set(c.id, span);
      used += span;
    });
    row = [];
  };
  for (const c of cards) {
    if (c.wide) {
      flush();
      spans.set(c.id, COLS);
    } else {
      row.push(c);
      if (row.length === perRow) flush();
    }
  }
  flush();
  return spans;
}

/** Sortable strategy that never slides other cards around; the layout re-flows on drop instead. */
const stayPut = () => null;

interface MoveApi {
  index: number;
  count: number;
  moveTo: (to: number) => void;
}

function SortableItem({ card, span, dimmed, marker, move }: { card: GridCard; span: number; dimmed: boolean; marker: 'before' | 'after' | null; move: MoveApi }) {
  const c = useColors(); // light or dark mode colours
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useSortable({ id: card.id });
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const go = (to: number) => { setMenu(null); move.moveTo(to); };
  const last = move.count - 1;
  const menuId = `move-menu-${card.id}`;
  const handle = (
    <>
      <Tooltip title="Move this chart: drag, or click for options">
        <IconButton
          ref={setActivatorNodeRef}
          size="small"
          {...attributes}
          {...listeners}
          // A click without dragging opens the move menu.
          onClick={(e) => setMenu(e.currentTarget)}
          aria-label={`Move ${card.title}`}
          aria-roledescription="movable chart"
          aria-haspopup="menu"
          aria-expanded={!!menu}
          aria-controls={menu ? menuId : undefined}
          sx={{ color: 'text.secondary', cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', '&:hover': { color: 'primary.main' } }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        <MenuItem disabled={move.index === 0} onClick={() => go(move.index - 1)}>Move up</MenuItem>
        <MenuItem disabled={move.index === last} onClick={() => go(move.index + 1)}>Move down</MenuItem>
        <MenuItem disabled={move.index === 0} onClick={() => go(0)}>Move to top</MenuItem>
        <MenuItem disabled={move.index === last} onClick={() => go(last)}>Move to bottom</MenuItem>
      </Menu>
    </>
  );
  const bar = { content: '""', position: 'absolute', top: 8, bottom: 8, width: 4, borderRadius: 2, bgcolor: tokens.color.accent, zIndex: 1 } as const;
  return (
    <Box
      ref={setNodeRef}
      sx={{
        gridColumn: `span ${span}`, minWidth: 0, display: 'flex', position: 'relative', px: 1.25, // half of the 20 px gutter each side
        '& > *': { flex: 1 },
        ...(dimmed && { opacity: 0.35, '& > *': { flex: 1, outline: `2px dashed ${c.maxNeutral}`, outlineOffset: -2 } }),
        // Green bar on the side where the dragged card will land.
        ...(marker === 'before' && { '&::before': { ...bar, left: -2 } }),
        ...(marker === 'after' && { '&::after': { ...bar, right: -2 } }),
        transition: 'opacity .15s',
      }}
    >
      {card.render(handle)}
    </Box>
  );
}

export default function SortableCardGrid({ cards, order, onOrderChange }: { cards: GridCard[]; order: string[]; onOrderChange: (order: string[]) => void }) {
  const theme = useTheme();
  const xl = useMediaQuery(theme.breakpoints.up('xl'));
  const lg = useMediaQuery(theme.breakpoints.up('lg'));
  const md = useMediaQuery(theme.breakpoints.up('md'));
  // Large text needs wider cards: one fewer per row until the screen is very wide.
  const large = useTextSize().textSize === 'large';
  const perRow = large ? (xl ? 3 : md ? 2 : 1) : lg ? 3 : md ? 2 : 1;
  const byId = new Map(cards.map((c) => [c.id, c]));
  const ordered = order.map((id) => byId.get(id)).filter((c): c is GridCard => !!c);
  const spans = layoutSpans(ordered, perRow);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // Space picks a card up for arrow-key moving; Enter is left for the move menu.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates, keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] } }),
  );
  const announce = useAnnounce();
  /** Move a card to a position from its menu, then say where it went. */
  const moveTo = (id: string, to: number) => {
    const from = order.indexOf(id);
    if (from < 0 || to === from) return;
    onOrderChange(arrayMove(order, from, to));
    announce(`${titleOf(id)} moved to position ${to + 1} of ${order.length}.`);
  };

  const titleOf = (id: unknown) => byId.get(String(id))?.title ?? 'chart';
  const posOf = (id: unknown) => order.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}, position ${posOf(active.id)} of ${order.length}. Use the arrow keys to move, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => (over ? `${titleOf(active.id)} will move to position ${posOf(over.id)} of ${order.length}.` : `${titleOf(active.id)} is not over a chart.`),
    onDragEnd: ({ active, over }) => (over ? `${titleOf(active.id)} moved to position ${posOf(over.id)} of ${order.length}.` : `${titleOf(active.id)} dropped back in place.`),
    onDragCancel: ({ active }) => `Move cancelled. ${titleOf(active.id)} stays at position ${posOf(active.id)}.`,
  };

  const clear = () => {
    setActiveId(null);
    setOverId(null);
  };
  const onStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);
  const onEnd = (e: DragEndEvent) => {
    const from = order.indexOf(String(e.active.id));
    const to = e.over ? order.indexOf(String(e.over.id)) : -1;
    if (from >= 0 && to >= 0 && from !== to) onOrderChange(arrayMove(order, from, to));
    clear();
  };

  // Where the green bar goes: arrayMove puts the card AFTER the target when moving forward, BEFORE when moving back.
  const markerFor = (id: string): 'before' | 'after' | null => {
    if (!activeId || !overId || id !== overId || id === activeId) return null;
    return order.indexOf(activeId) < order.indexOf(overId) ? 'after' : 'before';
  };
  const active = activeId ? byId.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onStart}
      onDragOver={onOver}
      onDragEnd={onEnd}
      onDragCancel={clear}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'To move this chart, press Enter for a menu of moves. Or press Space, use the arrow keys to choose where it goes, and press Space again to drop it, or Escape to cancel.' },
      }}
    >
      <SortableContext items={order} strategy={stayPut}>
        {/* No column gap (60 gaps would add up to 1180 px); each card is padded 10 px a side instead and the grid pulled out by 10 px. */}
        <Box sx={{ display: 'grid', rowGap: 2.5, columnGap: 0, mx: -1.25, gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {ordered.map((c) => (
            <SortableItem key={c.id} card={c} span={spans.get(c.id) ?? COLS} dimmed={c.id === activeId} marker={markerFor(c.id)} move={{ index: order.indexOf(c.id), count: order.length, moveTo: (to) => moveTo(c.id, to) }} />
          ))}
        </Box>
      </SortableContext>
      {/* Small ghost that follows the pointer (charts aren't cloned: cheap and smooth) */}
      <DragOverlay dropAnimation={null}>
        {active ? (
          <Paper sx={{ px: 1.5, py: 1, display: 'inline-flex', alignItems: 'center', gap: 1, boxShadow: 6, border: `2px solid ${tokens.color.accent}`, cursor: 'grabbing', whiteSpace: 'nowrap' }}>
            <DragIndicatorIcon fontSize="small" sx={{ color: 'primary.main' }} />
            <Typography variant="overline" sx={{ color: 'primary.main', lineHeight: 1.6 }}>{active.title}</Typography>
          </Paper>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
