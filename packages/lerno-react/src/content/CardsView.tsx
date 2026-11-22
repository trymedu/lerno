'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Chip } from '@heroui/react';
import type { Card, CardsNode } from '@medu/lerno';

/** Props accepted by `CardsView`. */
export interface CardsViewProps {
  node: CardsNode;
}

/** Deterministic shuffle so a card set looks the same on every render. */
function shuffle(ids: string[], seed: number): string[] {
  const result = [...ids];
  let state = seed || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const swap = state % (index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Renders a done-of-total chip with an optional caption.
 * @param done - Number of completed items.
 * @param total - Number of items in the set.
 * @param children - Short caption rendered next to the chip.
 */
function Progress({ done, total, children }: { done: number; total: number; children?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Chip color={done === total ? 'success' : 'default'} className="tabular-nums">
        {done}/{total}
      </Chip>
      {children ? <span className="text-xs text-muted">{children}</span> : null}
    </div>
  );
}

/**
 * Front-and-back card grid; tapping a card reveals its back.
 * Cards stay in place, so the layout never reflows as cards are revealed.
 */
function FlipCards({ cards }: { cards: Card[] }) {
  const [revealed, setRevealed] = useState<string[]>([]);

  function toggle(id: string): void {
    setRevealed((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => {
          const shown = revealed.includes(card.id);
          return (
            <Button
              key={card.id}
              variant={shown ? 'primary' : 'outline'}
              className="min-h-28 whitespace-normal text-center"
              onPress={() => toggle(card.id)}
            >
              <span className="flex flex-col items-center gap-1">
                <span className="text-[10px] uppercase tracking-wide opacity-60">{shown ? 'Back' : 'Front'}</span>
                <span className="text-sm font-medium">{shown ? card.back : card.front}</span>
              </span>
            </Button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <Progress done={revealed.length} total={cards.length}>açılan kart</Progress>
        {revealed.length > 0 ? (
          <Button size="sm" variant="ghost" onPress={() => setRevealed([])}>
            Sıfırla
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Memory game grid; two open tiles of the same card form a matched pair.
 * A mismatch closes after a short delay, which keeps the retry loop readable.
 */
function MatchCards({ cards }: { cards: Card[] }) {
  const tiles = useMemo(() => shuffle(cards.flatMap((card) => [`${card.id}:front`, `${card.id}:back`]), cards.length * 7), [cards]);
  const [open, setOpen] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (open.length < 2) return;
    setMoves((value) => value + 1);
    const [first, second] = open;
    if (first.split(':')[0] === second.split(':')[0]) {
      setMatched((current) => [...current, first.split(':')[0]]);
      setOpen([]);
      return;
    }
    const timer = setTimeout(() => setOpen([]), 700);
    return () => clearTimeout(timer);
  }, [open]);

  function labelFor(tile: string): string {
    const [id, side] = tile.split(':');
    const card = cards.find((entry) => entry.id === id);
    if (!card) return '';
    return side === 'front' ? card.front : card.back;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => {
          const id = tile.split(':')[0];
          const isMatched = matched.includes(id);
          const isOpen = open.includes(tile);
          return (
            <Button
              key={tile}
              variant={isOpen || isMatched ? 'primary' : 'outline'}
              className="min-h-20 whitespace-normal text-center"
              isDisabled={isMatched || isOpen}
              onPress={() => setOpen((current) => (current.length < 2 ? [...current, tile] : current))}
            >
              {isMatched || isOpen ? labelFor(tile) : '·'}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <Progress done={matched.length} total={cards.length}>çift bulundu</Progress>
        <span className="text-xs text-muted tabular-nums">{moves} deneme</span>
      </div>
    </div>
  );
}

/**
 * Ordered list the learner rearranges with the up and down controls.
 * Checking compares the current order against the declaration order.
 */
function OrderCards({ cards }: { cards: Card[] }) {
  const correct = useMemo(() => cards.map((card) => card.id), [cards]);
  const [order, setOrder] = useState<string[]>(() => shuffle(correct, cards.length * 3));
  const [checked, setChecked] = useState(false);

  const labels = new Map(cards.map((card) => [card.id, card.front]));
  const isCorrect = order.every((id, index) => id === correct[index]);

  function move(index: number, delta: number): void {
    setChecked(false);
    setOrder((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {order.map((id, index) => (
        <div key={id} className="flex items-center gap-2 rounded-2xl border border-black/[0.06] px-4 py-2 dark:border-white/[0.08]">
          <span className="w-5 text-xs text-muted tabular-nums">{index + 1}</span>
          <span className="flex-1 text-sm text-foreground">{labels.get(id)}</span>
          <Button size="sm" variant="ghost" isDisabled={index === 0} onPress={() => move(index, -1)}>
            Yukarı
          </Button>
          <Button size="sm" variant="ghost" isDisabled={index === order.length - 1} onPress={() => move(index, 1)}>
            Aşağı
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <Button variant="primary" onPress={() => setChecked(true)}>
          Kontrol et
        </Button>
        {checked ? <Chip color={isCorrect ? 'success' : 'danger'}>{isCorrect ? 'Correct order' : 'Order is not correct yet'}</Chip> : null}
        <Button size="sm" variant="ghost" onPress={() => { setOrder(shuffle(correct, cards.length * 3)); setChecked(false); }}>
          Karıştır
        </Button>
      </div>
    </div>
  );
}

/**
 * Renders a card deck node in the mode declared by the document.
 * Routes to the flip, match, or order variant; unknown modes render nothing.
 */
export function CardsView({ node }: CardsViewProps) {
  return (
    <div className="flex flex-col gap-3">
      {node.title ? <span className="text-sm font-semibold text-foreground">{node.title}</span> : null}
      {node.mode === 'flip' ? <FlipCards cards={node.cards} /> : null}
      {node.mode === 'match' ? <MatchCards cards={node.cards} /> : null}
      {node.mode === 'order' ? <OrderCards cards={node.cards} /> : null}
    </div>
  );
}
