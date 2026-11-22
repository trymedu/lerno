'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Chip,
  Input,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  TextArea,
} from '@heroui/react';
import { type GradeOutcome, type QuestionItem } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `QuestionView`. */
export interface QuestionViewProps {
  item: QuestionItem;
  outcome?: GradeOutcome;
  onAnswer: (response: unknown) => void;
  disabled?: boolean;
}

/**
 * Shuffles a list deterministically from a numeric seed.
 * @param ids - Ids to shuffle.
 * @param seed - Seed derived from the question, so order is stable per learner.
 * @returns The shuffled copy; the input is not mutated.
 */
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
 * Turns a string into a stable numeric seed.
 * @param value - Text to hash.
 * @returns A positive integer used to seed the shuffle.
 */
function seedOf(value: string): number {
  let seed = 7;
  for (let index = 0; index < value.length; index += 1) seed = (seed * 31 + value.charCodeAt(index)) % 4294967296;
  return seed;
}

/**
 * Maps a grading outcome onto a color token.
 * @param outcome - Graded answer of the question.
 * @returns The chip color reflecting correctness.
 */
function outcomeColor(outcome: GradeOutcome): 'success' | 'danger' | 'warning' | 'default' {
  switch (outcome.status) {
    case 'correct':
      return 'success';
    case 'incorrect':
      return 'danger';
    case 'partial':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Maps a grading outcome onto a short label.
 * @param outcome - Graded answer of the question.
 * @returns A one-word label shown on the response chip.
 */
function outcomeLabel(outcome: GradeOutcome): string {
  switch (outcome.status) {
    case 'correct':
      return 'Correct';
    case 'incorrect':
      return 'Incorrect';
    case 'partial':
      return 'Partially correct';
    case 'pending':
      return 'Awaiting review';
    default:
      return 'Not scored';
  }
}

/**
 * Renders a question, its choices, and the feedback once it is answered.
 * Calls onAnswer with the raw response; grading stays in the session.
 */
export function QuestionView({ item, outcome, onAnswer, disabled = false }: QuestionViewProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [blankValues, setBlankValues] = useState<string[]>([]);
  const [relations, setRelations] = useState<{ from: string; to: string }[]>([]);
  const [relationFrom, setRelationFrom] = useState('');
  const [relationTo, setRelationTo] = useState('');
  const [stepValues, setStepValues] = useState<string[]>([]);

  useEffect(() => {
    setSelected([]);
    setText('');
    setMatches({});
    setRelations([]);
    setRelationFrom('');
    setRelationTo('');
    if (item.kind === 'ordering') setOrder(shuffle(item.items.map((entry) => entry.id), seedOf(item.prompt)));
    if (item.kind === 'fill-blanks') setBlankValues(item.blanks.map(() => ''));
    if (item.kind === 'solution-steps') setStepValues(item.steps.map(() => ''));
  }, [item]);

  const answered = outcome !== undefined;
  const locked = disabled || answered;

  function body() {
    switch (item.kind) {
      case 'multiple-choice':
      case 'poll': {
        const multiple = item.kind === 'multiple-choice' && item.multiple;
        return (
          <div className="flex flex-col gap-3">
            {multiple ? (
              <CheckboxGroup className="flex flex-col gap-2" value={selected} onChange={(value) => setSelected(value)}>
                {item.choices.map((choice) => (
                  <Checkbox key={choice.id} value={choice.id} isDisabled={locked}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      {choice.label}
                    </Checkbox.Content>
                  </Checkbox>
                ))}
              </CheckboxGroup>
            ) : (
              <RadioGroup className="flex flex-col gap-2" value={selected[0] ?? ''} onChange={(value) => setSelected(value ? [value] : [])}>
                {item.choices.map((choice) => (
                  <Radio key={choice.id} value={choice.id} isDisabled={locked}>
                    <Radio.Content>
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      {choice.label}
                    </Radio.Content>
                  </Radio>
                ))}
              </RadioGroup>
            )}
            <Button
              variant="primary"
              isDisabled={locked || selected.length === 0}
              onPress={() => onAnswer({ selected })}
            >
              {item.kind === 'poll' ? 'Oy ver' : 'Answer'}
            </Button>
          </div>
        );
      }

      case 'true-false':
        return (
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" isDisabled={locked} onPress={() => onAnswer({ value: true })}>
              Correct
            </Button>
            <Button variant="outline" isDisabled={locked} onPress={() => onAnswer({ value: false })}>
              Incorrect
            </Button>
          </div>
        );

      case 'short-answer':
      case 'equation':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <Input
              className="w-full sm:w-72"
              value={text}
              disabled={locked}
              placeholder={item.kind === 'equation' ? 'Type the equation' : 'Type your answer'}
              onChange={(event) => setText(event.target.value)}
            />
            <Button variant="primary" isDisabled={locked || !text.trim()} onPress={() => onAnswer({ text })}>
              Answer
            </Button>
          </div>
        );

      case 'numeric':
        return (
          <div className="flex flex-wrap items-end gap-3">
            <Input
              className="w-40"
              type="number"
              value={text}
              disabled={locked}
              placeholder="Number"
              onChange={(event) => setText(event.target.value)}
            />
            <Button variant="primary" isDisabled={locked || text.trim() === ''} onPress={() => onAnswer({ value: Number(text) })}>
              Answer
            </Button>
          </div>
        );

      case 'open':
        return (
          <div className="flex flex-col gap-3">
            <TextArea
              className="w-full"
              value={text}
              disabled={locked}
              placeholder="Type your answer"
              onChange={(event) => setText(event.target.value)}
            />
            <Button variant="primary" isDisabled={locked} onPress={() => onAnswer({ text, rubricScores: {} })}>
              Submit
            </Button>
          </div>
        );

      case 'scale':
        return (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: item.max - item.min + 1 }, (_, index) => item.min + index).map((value) => (
              <Button key={value} variant="outline" isDisabled={locked} onPress={() => onAnswer({ value })}>
                {value}
              </Button>
            ))}
          </div>
        );

      case 'ordering': {
        const labels = new Map(item.items.map((entry) => [entry.id, entry.label]));
        const move = (index: number, delta: number) => {
          setOrder((current) => {
            const next = [...current];
            const target = index + delta;
            if (target < 0 || target >= next.length) return current;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
          });
        };
        return (
          <div className="flex flex-col gap-2">
            {order.map((id, index) => (
              <div key={id} className="flex items-center gap-2 rounded-2xl border border-border px-4 py-2">
                <span className="flex-1 text-sm text-foreground">{labels.get(id)}</span>
                <Button size="sm" variant="ghost" isDisabled={locked || index === 0} onPress={() => move(index, -1)}>
                  ↑
                </Button>
                <Button size="sm" variant="ghost" isDisabled={locked || index === order.length - 1} onPress={() => move(index, 1)}>
                  ↓
                </Button>
              </div>
            ))}
            <Button variant="primary" isDisabled={locked || order.length === 0} onPress={() => onAnswer({ order })}>
              Answer
            </Button>
          </div>
        );
      }

      case 'matching': {
        const rightOptions = shuffle([...new Set(item.pairs.map((pair) => pair.right))], seedOf(item.prompt));
        const complete = item.pairs.every((pair) => matches[pair.left]);
        return (
          <div className="flex flex-col gap-3">
            {item.pairs.map((pair) => (
              <div key={pair.left} className="flex flex-wrap items-center gap-3">
                <span className="min-w-32 flex-1 text-sm text-foreground">{pair.left}</span>
                <Select
                  className="w-full sm:w-56"
                  value={matches[pair.left] ?? ''}
                  isDisabled={locked}
                  aria-label={pair.left}
                  onChange={(key) => setMatches((current) => ({ ...current, [pair.left]: String(key) }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {rightOptions.map((right) => (
                        <ListBox.Item key={right} id={right} textValue={right}>
                          {right}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            ))}
            <Button
              variant="primary"
              isDisabled={locked || !complete}
              onPress={() => onAnswer({ pairs: item.pairs.map((pair) => ({ left: pair.left, right: matches[pair.left] ?? '' })) })}
            >
              Answer
            </Button>
          </div>
        );
      }

      case 'fill-blanks': {
        const parts = item.text.split(/(\{\{\d+\}\})/);
        return (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm leading-loose text-foreground">
              {parts.map((part, index) => {
                const match = /^\{\{(\d+)\}\}$/.exec(part);
                if (!match) return <span key={index}>{part}</span>;
                const blankIndex = Number(match[1]);
                return (
                  <Input
                    key={index}
                    className="mx-1 inline-flex w-32"
                    value={blankValues[blankIndex] ?? ''}
                    disabled={locked}
                    aria-label={`Blank ${blankIndex + 1}`}
                    onChange={(event) =>
                      setBlankValues((current) => current.map((value, position) => (position === blankIndex ? event.target.value : value)))
                    }
                  />
                );
              })}
            </p>
            <Button variant="primary" isDisabled={locked} onPress={() => onAnswer({ values: blankValues })}>
              Answer
            </Button>
          </div>
        );
      }

      case 'concept-map': {
        const labelOf = new Map(item.concepts.map((concept) => [concept.id, concept.label]));
        const addRelation = () => {
          if (!relationFrom || !relationTo || relationFrom === relationTo) return;
          const exists = relations.some(
            (relation) =>
              (relation.from === relationFrom && relation.to === relationTo) ||
              (relation.from === relationTo && relation.to === relationFrom),
          );
          if (exists) return;
          setRelations((current) => [...current, { from: relationFrom, to: relationTo }]);
          setRelationFrom('');
          setRelationTo('');
        };
        const conceptOptions = item.concepts.map((concept) => ({ value: concept.id, label: concept.label }));
        return (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <Select className="w-full sm:w-48" value={relationFrom} isDisabled={locked} aria-label="Kaynak kavram" onChange={(key) => setRelationFrom(String(key))}>
                <Label>Kavram</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {conceptOptions.map((option) => (
                      <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Select className="w-full sm:w-48" value={relationTo} isDisabled={locked} aria-label="Hedef kavram" onChange={(key) => setRelationTo(String(key))}>
                <Label>İlişkili kavram</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {conceptOptions.map((option) => (
                      <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
                        {option.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Button variant="secondary" isDisabled={locked || !relationFrom || !relationTo} onPress={addRelation}>
                Ekle
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {relations.map((relation, index) => (
                <Chip key={`${relation.from}-${relation.to}`} color="accent">
                  <button type="button" disabled={locked} onClick={() => setRelations((current) => current.filter((_, position) => position !== index))}>
                    {labelOf.get(relation.from)} — {labelOf.get(relation.to)} ✕
                  </button>
                </Chip>
              ))}
            </div>
            <Button variant="primary" isDisabled={locked} onPress={() => onAnswer({ relations })}>
              Answer
            </Button>
          </div>
        );
      }

      case 'solution-steps':
        return (
          <div className="flex flex-col gap-3">
            {item.steps.map((step, index) => (
              <div key={step.id} className="flex flex-col gap-1.5">
                <Label>{step.prompt ?? `Step ${index + 1}`}</Label>
                <Input
                  value={stepValues[index] ?? ''}
                  disabled={locked}
                  onChange={(event) => setStepValues((current) => current.map((value, position) => (position === index ? event.target.value : value)))}
                />
              </div>
            ))}
            <Button variant="primary" isDisabled={locked} onPress={() => onAnswer({ steps: stepValues })}>
              Answer
            </Button>
          </div>
        );

      default:
        return <p className="text-sm text-muted">Bu soru tipi için görüntüleyici henüz eklenmedi.</p>;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-base font-semibold text-foreground">{item.prompt}</p>
      {body()}
      {answered && outcome ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Chip color={outcomeColor(outcome)}>{outcomeLabel(outcome)}</Chip>
            {outcome.maxScore > 0 ? (
              <span className="text-xs text-muted tabular-nums">
                {outcome.score}/{outcome.maxScore}
              </span>
            ) : null}
          </div>
          {outcome.misconceptions && outcome.misconceptions.length > 0 ? (
            <span className="text-xs" style={{ color: sceneColors.accent }}>
              Kavram yanılgısı: {outcome.misconceptions.join(', ')}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
