import { z } from 'zod';

/**
 * Lerno content document contract.
 * The schema is independent of any application: it defines only content types,
 * the node graph, flows, and scoring. Application concerns such as live classes,
 * databases, telemetry, xAPI, object storage, and language models are injected
 * through extensions and host
 * adapters.
 */
export const LERNO_SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** Zod schema for `AssetKind` payloads. */
export const AssetKindSchema = z.enum(['image', 'video', 'audio', 'model', 'document']);

/** Zod schema for `AssetRef` payloads. */
export const AssetRefSchema = z.object({
  id: z.string().min(1),
  kind: AssetKindSchema,
  src: z.string().min(1),
  mimeType: z.string().optional(),
  alt: z.string().optional(),
});

/** Zod schema for `OutcomeRef` payloads. */
export const OutcomeRefSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  label: z.string().optional(),
});

/** Zod schema for `DocumentMetadata` payloads. */
export const DocumentMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
  grade: z.number().int().optional(),
  language: z.string().default('tr'),
  outcomes: z.array(OutcomeRefSchema).default([]),
  tags: z.array(z.string()).default([]),
});

/** Zod schema for `Theme` payloads. */
export const ThemeSchema = z.object({
  name: z.string().optional(),
  colors: z.record(z.string(), z.string()).default({}),
});

/** Zod schema for `Scoring` payloads. */
export const ScoringSchema = z.object({
  mode: z.enum(['sum', 'average', 'pass-fail']).default('sum'),
  /** Passing threshold as a 0.0–1.0 ratio. */
  passingRatio: z.number().min(0).max(1).optional(),
});

/** Zod schema for `Flow` payloads. */
export const FlowSchema = z.object({
  mode: z.enum(['linear', 'graph', 'adaptive']).default('linear'),
});

// ---------------------------------------------------------------------------
// Interactive component layer
// ---------------------------------------------------------------------------

/** Component type declared at the top of video data. */
export const ComponentManifestEntrySchema = z.object({
  type: z.string().min(1),
  version: z.number().int().positive().default(1),
});

/** Zod schema for `VariableValue` payloads. */
export const VariableValueSchema = z.union([z.boolean(), z.number(), z.string()]);

/** A single variable that lives for the session. */
export const VariableDefinitionSchema = z
  .object({
    type: z.enum(['boolean', 'number', 'string']),
    initial: VariableValueSchema,
    enum: z.array(VariableValueSchema).min(1).optional(),
  })
  .superRefine((variable, ctx) => {
    if (typeof variable.initial !== variable.type) {
      ctx.addIssue({
        code: 'custom',
        message: `"initial" must be a ${variable.type}`,
        path: ['initial'],
      });
    }
    if (variable.enum && !variable.enum.some((entry) => entry === variable.initial)) {
      ctx.addIssue({
        code: 'custom',
        message: '"initial" must be one of the enum values',
        path: ['initial'],
      });
    }
  });

/** Normalized layer placement over the video (0–1). */
export const LayerPlacementSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
});

/** Zod schema for `LayerBinding` payloads. */
export const LayerBindingSchema = z.object({
  /** Variable bound in both directions. */
  value: z.string().min(1).optional(),
});

/** Zod schema for `LayerCondition` payloads. */
export const LayerConditionSchema = z.object({
  variable: z.string().min(1),
  equals: VariableValueSchema,
});

/** Interaction layer shown over the video for a time range. */
export const InteractionLayerSchema = z
  .object({
    id: z.string().min(1),
    component: z.string().min(1),
    fromMs: z.number().min(0),
    toMs: z.number().min(0).optional(),
    placement: LayerPlacementSchema.default({ x: 0.7, y: 0.1, w: 0.25, h: 0.12 }),
    props: z.record(z.string(), z.unknown()).default({}),
    bind: LayerBindingSchema.default({}),
    visibleWhen: LayerConditionSchema.optional(),
    /** Fade-in and fade-out window at each end of the layer's range, in ms. */
    fadeMs: z.number().min(0).default(0),
  })
  .superRefine((layer, ctx) => {
    if (layer.toMs !== undefined && layer.toMs <= layer.fromMs) {
      ctx.addIssue({ code: 'custom', message: '"toMs" must be greater than "fromMs"', path: ['toMs'] });
    }
  });

// ---------------------------------------------------------------------------
// Question kinds (phase 1 core set)
// ---------------------------------------------------------------------------

/** Zod schema for `Choice` payloads. */
export const ChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Misconception a distractor points to, for diagnostics. */
  misconception: z.string().optional(),
});

/** Zod schema for `MultipleChoiceItem` payloads. */
export const MultipleChoiceItemSchema = z.object({
  kind: z.literal('multiple-choice'),
  prompt: z.string().min(1),
  choices: z.array(ChoiceSchema).min(2),
  correct: z.array(z.string().min(1)).min(1),
  multiple: z.boolean().default(false),
});

/** Zod schema for `TrueFalseItem` payloads. */
export const TrueFalseItemSchema = z.object({
  kind: z.literal('true-false'),
  prompt: z.string().min(1),
  correct: z.boolean(),
});

/** Zod schema for `ShortAnswerItem` payloads. */
export const ShortAnswerItemSchema = z.object({
  kind: z.literal('short-answer'),
  prompt: z.string().min(1),
  accepted: z.array(z.string().min(1)).min(1),
  caseSensitive: z.boolean().default(false),
});

/** Zod schema for `NumericItem` payloads. */
export const NumericItemSchema = z.object({
  kind: z.literal('numeric'),
  prompt: z.string().min(1),
  value: z.number(),
  tolerance: z.number().min(0).default(0),
  unit: z.string().optional(),
});

/** Zod schema for `FillBlanksItem` payloads. */
export const FillBlanksItemSchema = z.object({
  kind: z.literal('fill-blanks'),
  prompt: z.string().min(1),
  /** Placeholders such as {{0}}, {{1}} inside the text. */
  text: z.string().min(1),
  blanks: z
    .array(
      z.object({
        accepted: z.array(z.string().min(1)).min(1),
        caseSensitive: z.boolean().default(false),
      }),
    )
    .min(1),
});

/** Zod schema for `OrderingItem` payloads. */
export const OrderingItemSchema = z.object({
  kind: z.literal('ordering'),
  prompt: z.string().min(1),
  /** Given in correct order; shuffled for presentation. */
  items: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
});

/** Zod schema for `MatchingItem` payloads. */
export const MatchingItemSchema = z.object({
  kind: z.literal('matching'),
  prompt: z.string().min(1),
  pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
});

/** Zod schema for `RubricCriterion` payloads. */
export const RubricCriterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  points: z.number().min(0),
});

/** Zod schema for `OpenItem` payloads. */
export const OpenItemSchema = z.object({
  kind: z.literal('open'),
  prompt: z.string().min(1),
  rubric: z.array(RubricCriterionSchema).default([]),
});

/** Zod schema for `PollItem` payloads. */
export const PollItemSchema = z.object({
  kind: z.literal('poll'),
  prompt: z.string().min(1),
  choices: z.array(ChoiceSchema).min(2),
});

/** Zod schema for `ScaleItem` payloads. */
export const ScaleItemSchema = z.object({
  kind: z.literal('scale'),
  prompt: z.string().min(1),
  min: z.number().int().default(1),
  max: z.number().int().default(5),
  minLabel: z.string().optional(),
  maxLabel: z.string().optional(),
});

/** Zod schema for `EquationItem` payloads. */
export const EquationItemSchema = z.object({
  kind: z.literal('equation'),
  prompt: z.string().min(1),
  /** Accepted equivalent forms, compared after normalization. */
  accepted: z.array(z.string().min(1)).min(1),
  caseSensitive: z.boolean().default(false),
});

/** Zod schema for `ConceptRelation` payloads. */
export const ConceptRelationSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

/** Zod schema for `ConceptMapItem` payloads. */
export const ConceptMapItemSchema = z.object({
  kind: z.literal('concept-map'),
  prompt: z.string().min(1),
  concepts: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
  /** Correct relations, compared without direction. */
  relations: z.array(ConceptRelationSchema).min(1),
});

/** Zod schema for `SolutionStep` payloads. */
export const SolutionStepSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().optional(),
  accepted: z.array(z.string().min(1)).min(1),
  caseSensitive: z.boolean().default(false),
});

/** Zod schema for `SolutionStepsItem` payloads. */
export const SolutionStepsItemSchema = z.object({
  kind: z.literal('solution-steps'),
  prompt: z.string().min(1),
  steps: z.array(SolutionStepSchema).min(1),
});

/** Zod schema for `QuestionItem` payloads. */
export const QuestionItemSchema = z.discriminatedUnion('kind', [
  MultipleChoiceItemSchema,
  TrueFalseItemSchema,
  ShortAnswerItemSchema,
  NumericItemSchema,
  FillBlanksItemSchema,
  OrderingItemSchema,
  MatchingItemSchema,
  OpenItemSchema,
  PollItemSchema,
  ScaleItemSchema,
  EquationItemSchema,
  ConceptMapItemSchema,
  SolutionStepsItemSchema,
]);

/** Zod schema for `Feedback` payloads. */
export const FeedbackSchema = z.object({
  correct: z.string().optional(),
  incorrect: z.string().optional(),
  hint: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Slide blocks
// ---------------------------------------------------------------------------

/** Zod schema for `TextBlock` payloads. */
export const TextBlockSchema = z.object({ type: z.literal('text'), markdown: z.string().min(1) });

/** Zod schema for `HeadingBlock` payloads. */
export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  text: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
});

/** Zod schema for `ImageBlock` payloads. */
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  assetId: z.string().min(1),
  caption: z.string().optional(),
});

/** Zod schema for `CalloutBlock` payloads. */
export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  tone: z.enum(['info', 'success', 'warning', 'danger']).default('info'),
  body: z.string().min(1),
});

/** Zod schema for `QuestionBlock` payloads. */
export const QuestionBlockSchema = z.object({
  type: z.literal('question'),
  item: QuestionItemSchema,
  feedback: FeedbackSchema.optional(),
  points: z.number().default(1),
});

/** Zod schema for `SlideBlock` payloads. */
export const SlideBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  HeadingBlockSchema,
  ImageBlockSchema,
  CalloutBlockSchema,
]);

// ---------------------------------------------------------------------------
// Flow nodes
// ---------------------------------------------------------------------------

/** Zod schema for `SlideNode` payloads. */
export const SlideNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('slide'),
  title: z.string().optional(),
  blocks: z.array(SlideBlockSchema).default([]),
});

/** Zod schema for `QuestionNode` payloads. */
export const QuestionNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('question'),
  item: QuestionItemSchema,
  feedback: FeedbackSchema.optional(),
  points: z.number().default(1),
  /** Next node in an explicit flow; falls back to document order. */
  next: z.string().optional(),
});

/** Zod schema for `MediaAnchor` payloads. */
export const MediaAnchorSchema = z.object({
  id: z.string().min(1),
  atMs: z.number().min(0),
  kind: z.enum(['info', 'pause', 'question']),
  label: z.string().min(1),
  body: z.string().optional(),
  item: QuestionItemSchema.optional(),
});

/** Zod schema for `CaptionTrack` payloads. */
export const CaptionTrackSchema = z.object({
  /** WebVTT file; relative URLs resolve against the page. */
  src: z.string().min(1),
  /** BCP 47 language tag, for example `tr` or `en`. */
  lang: z.string().min(1),
  label: z.string().min(1),
  default: z.boolean().default(false),
});

/** Zod schema for `MediaNode` payloads. */
export const MediaNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('media'),
  assetId: z.string().min(1),
  anchors: z.array(MediaAnchorSchema).default([]),
  /** Subtitle and caption tracks handed to the video element. */
  captions: z.array(CaptionTrackSchema).default([]),
  /** Interaction layers shown over the video for a time range. */
  layers: z.array(InteractionLayerSchema).default([]),
  next: z.string().optional(),
});

/** Zod schema for `BranchChoice` payloads. */
export const BranchChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  target: z.string().min(1),
  tag: z.string().optional(),
});

/** Zod schema for `BranchNode` payloads. */
export const BranchNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('branch'),
  prompt: z.string().min(1),
  choices: z.array(BranchChoiceSchema).min(1),
});

/** Zod schema for `InfoPanel` payloads. */
export const InfoPanelSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
});

/** Zod schema for `InfoNode` payloads. */
export const InfoNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('info'),
  title: z.string().optional(),
  panels: z.array(InfoPanelSchema).min(1),
  next: z.string().optional(),
});

/** Application-specific nodes are drawn by an extension. */
export const CustomNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('custom'),
  extension: z.string().min(1),
  kind: z.string().min(1),
  data: z.unknown(),
});

// --- Kartlar (Dialog Cards / Flashcards / Memory Game) ---

/** Zod schema for `Card` payloads. */
export const CardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string().min(1),
});

/** Zod schema for `CardsMode` payloads. */
export const CardsModeSchema = z.enum(['flip', 'match', 'order']);

/** Zod schema for `CardsNode` payloads. */
export const CardsNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('cards'),
  mode: CardsModeSchema.default('flip'),
  title: z.string().optional(),
  cards: z.array(CardSchema).min(2),
  next: z.string().optional(),
});

// --- Image hotspot (Image Hotspots / Find the Hotspot) ---

/** Zod schema for `Hotspot` payloads. */
export const HotspotSchema = z.object({
  id: z.string().min(1),
  /** Relative position from 0 to 1. */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  label: z.string().min(1),
  body: z.string().optional(),
  /** `find` modunda hedef hotspot. */
  correct: z.boolean().default(false),
});

/** Zod schema for `HotspotNode` payloads. */
export const HotspotNodeSchema = z.object({
  id: z.string().min(1),
  type: z.literal('hotspot'),
  assetId: z.string().min(1),
  mode: z.enum(['explore', 'find']).default('explore'),
  title: z.string().optional(),
  spots: z.array(HotspotSchema).min(1),
  next: z.string().optional(),
});

/** Zod schema for `Node` payloads. */
export const NodeSchema = z.discriminatedUnion('type', [
  SlideNodeSchema,
  QuestionNodeSchema,
  MediaNodeSchema,
  BranchNodeSchema,
  InfoNodeSchema,
  CustomNodeSchema,
  CardsNodeSchema,
  HotspotNodeSchema,
]);

// ---------------------------------------------------------------------------
// Belge
// ---------------------------------------------------------------------------

/** Zod schema for `LernoDocument` payloads. */
export const LernoDocumentSchema = z
  .object({
    schemaVersion: z.number().int().default(LERNO_SCHEMA_VERSION),
    id: z.string().min(1),
    type: z.string().min(1),
    metadata: DocumentMetadataSchema,
    theme: ThemeSchema.default({ colors: {} }),
    assets: z.array(AssetRefSchema).default([]),
    /** Component types used by the document; the runtime loads only these. */
    components: z.array(ComponentManifestEntrySchema).default([]),
    /** Variables that live for the session. */
    variables: z.record(z.string(), VariableDefinitionSchema).default({}),
    nodes: z.array(NodeSchema).min(1),
    flow: FlowSchema.default({ mode: 'linear' }),
    scoring: ScoringSchema.default({ mode: 'sum' }),
  })
  .superRefine((document, ctx) => {
    const variableNames = new Set(Object.keys(document.variables));
    const componentTypes = new Set<string>();
    const layerIds = new Set<string>();

    for (const component of document.components) {
      if (componentTypes.has(component.type)) {
        ctx.addIssue({
          code: 'custom',
          message: `Component type declared more than once: ${component.type}`,
          path: ['components'],
        });
      }
      componentTypes.add(component.type);
    }

    const checkVariable = (name: string, path: (string | number)[]): void => {
      if (!variableNames.has(name)) {
        ctx.addIssue({ code: 'custom', message: `Unknown variable: ${name}`, path });
      }
    };

    const checkProps = (value: unknown, path: (string | number)[]): void => {
      if (Array.isArray(value)) {
        value.forEach((entry, index) => checkProps(entry, [...path, index]));
        return;
      }
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const reference = record.$var;
        if (typeof reference === 'string') checkVariable(reference, [...path, '$var']);
        for (const [key, entry] of Object.entries(record)) {
          if (key !== '$var') checkProps(entry, [...path, key]);
        }
      }
    };

    const nodeIds = new Set<string>();
    const anchorIds = new Set<string>();

    document.nodes.forEach((node, nodeIndex) => {
      if (nodeIds.has(node.id)) {
        ctx.addIssue({ code: 'custom', message: `Duplicate node id: ${node.id}`, path: ['nodes', nodeIndex, 'id'] });
      }
      nodeIds.add(node.id);
    });

    const checkItem = (item: { kind: string } & Record<string, unknown>, path: (string | number)[]): void => {
      if (item.kind !== 'multiple-choice') return;
      const choices = Array.isArray(item.choices) ? item.choices : [];
      const choiceIds = new Set<string>();
      choices.forEach((choice, index) => {
        const entry = choice as { id?: unknown };
        const id = typeof entry.id === 'string' ? entry.id : '';
        if (choiceIds.has(id)) {
          ctx.addIssue({ code: 'custom', message: `Duplicate choice id: ${id}`, path: [...path, 'choices', index, 'id'] });
        }
        choiceIds.add(id);
      });
      const correct = Array.isArray(item.correct) ? item.correct : [];
      correct.forEach((value, index) => {
        if (typeof value === 'string' && !choiceIds.has(value)) {
          ctx.addIssue({ code: 'custom', message: `Correct answer is not among the choices: ${value}`, path: [...path, 'correct', index] });
        }
      });
    };

    document.nodes.forEach((node, nodeIndex) => {
      const next = 'next' in node ? node.next : undefined;
      if (next && !nodeIds.has(next)) {
        ctx.addIssue({ code: 'custom', message: `next target not found: ${next}`, path: ['nodes', nodeIndex, 'next'] });
      }

      if (node.type === 'branch') {
        node.choices.forEach((choice, choiceIndex) => {
          if (!nodeIds.has(choice.target)) {
            ctx.addIssue({
              code: 'custom',
              message: `Branch target not found: ${choice.target}`,
              path: ['nodes', nodeIndex, 'choices', choiceIndex, 'target'],
            });
          }
        });
      }

      if (node.type === 'question') checkItem(node.item, ['nodes', nodeIndex, 'item']);

      if (node.type === 'media') {
        node.anchors.forEach((anchor, anchorIndex) => {
          if (anchorIds.has(anchor.id)) {
            ctx.addIssue({ code: 'custom', message: `Duplicate anchor id: ${anchor.id}`, path: ['nodes', nodeIndex, 'anchors', anchorIndex, 'id'] });
          }
          anchorIds.add(anchor.id);
          if (anchor.item) checkItem(anchor.item, ['nodes', nodeIndex, 'anchors', anchorIndex, 'item']);
        });
      }
    });

    document.nodes.forEach((node, nodeIndex) => {
      if (node.type !== 'media') return;
      node.layers.forEach((layer, layerIndex) => {
        const path = ['nodes', nodeIndex, 'layers', layerIndex];
        if (layerIds.has(layer.id)) {
          ctx.addIssue({ code: 'custom', message: `Duplicate layer id: ${layer.id}`, path: [...path, 'id'] });
        }
        layerIds.add(layer.id);

        if (!componentTypes.has(layer.component)) {
          ctx.addIssue({
            code: 'custom',
            message: `Layer component missing from the manifest: ${layer.component}`,
            path: [...path, 'component'],
          });
        }
        if (layer.bind.value) checkVariable(layer.bind.value, [...path, 'bind', 'value']);
        if (layer.visibleWhen) checkVariable(layer.visibleWhen.variable, [...path, 'visibleWhen', 'variable']);
        checkProps(layer.props, [...path, 'props']);
      });
    });
  });

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------

/** Reference to an asset by id. */
export type AssetRef = z.infer<typeof AssetRefSchema>;
/** Reference to a graded outcome by node id. */
export type OutcomeRef = z.infer<typeof OutcomeRefSchema>;
/** Document title, language, and authorship metadata. */
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
/** Document theme: palette and typography tokens. */
export type Theme = z.infer<typeof ThemeSchema>;
/** Document scoring mode and pass threshold. */
export type Scoring = z.infer<typeof ScoringSchema>;
/** Document flow mode and node ordering. */
export type Flow = z.infer<typeof FlowSchema>;
/** Component type registration in a document manifest. */
export type ComponentManifestEntry = z.infer<typeof ComponentManifestEntrySchema>;
/** `VariableValue` type. */
export type VariableValue = z.infer<typeof VariableValueSchema>;
/** `VariableDefinition` type. */
export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;
/** `LayerPlacement` type. */
export type LayerPlacement = z.infer<typeof LayerPlacementSchema>;
/** `LayerBinding` type. */
export type LayerBinding = z.infer<typeof LayerBindingSchema>;
/** `LayerCondition` type. */
export type LayerCondition = z.infer<typeof LayerConditionSchema>;
/** `InteractionLayer` type. */
export type InteractionLayer = z.infer<typeof InteractionLayerSchema>;
/** `Choice` type. */
export type Choice = z.infer<typeof ChoiceSchema>;
/** `MultipleChoiceItem` type. */
export type MultipleChoiceItem = z.infer<typeof MultipleChoiceItemSchema>;
/** `TrueFalseItem` type. */
export type TrueFalseItem = z.infer<typeof TrueFalseItemSchema>;
/** `ShortAnswerItem` type. */
export type ShortAnswerItem = z.infer<typeof ShortAnswerItemSchema>;
/** `NumericItem` type. */
export type NumericItem = z.infer<typeof NumericItemSchema>;
/** `FillBlanksItem` type. */
export type FillBlanksItem = z.infer<typeof FillBlanksItemSchema>;
/** `OrderingItem` type. */
export type OrderingItem = z.infer<typeof OrderingItemSchema>;
/** `MatchingItem` type. */
export type MatchingItem = z.infer<typeof MatchingItemSchema>;
/** `RubricCriterion` type. */
export type RubricCriterion = z.infer<typeof RubricCriterionSchema>;
/** `OpenItem` type. */
export type OpenItem = z.infer<typeof OpenItemSchema>;
/** `PollItem` type. */
export type PollItem = z.infer<typeof PollItemSchema>;
/** `ScaleItem` type. */
export type ScaleItem = z.infer<typeof ScaleItemSchema>;
/** `EquationItem` type. */
export type EquationItem = z.infer<typeof EquationItemSchema>;
/** `ConceptRelation` type. */
export type ConceptRelation = z.infer<typeof ConceptRelationSchema>;
/** `ConceptMapItem` type. */
export type ConceptMapItem = z.infer<typeof ConceptMapItemSchema>;
/** `SolutionStep` type. */
export type SolutionStep = z.infer<typeof SolutionStepSchema>;
/** `SolutionStepsItem` type. */
export type SolutionStepsItem = z.infer<typeof SolutionStepsItemSchema>;
/** `QuestionItem` type. */
export type QuestionItem = z.infer<typeof QuestionItemSchema>;
/** Kind of `Question`. */
export type QuestionKind = QuestionItem['kind'];
/** `Feedback` type. */
export type Feedback = z.infer<typeof FeedbackSchema>;
/** `SlideBlock` type. */
export type SlideBlock = z.infer<typeof SlideBlockSchema>;
/** `SlideNode` type. */
export type SlideNode = z.infer<typeof SlideNodeSchema>;
/** `QuestionNode` type. */
export type QuestionNode = z.infer<typeof QuestionNodeSchema>;
/** `MediaAnchor` type. */
export type MediaAnchor = z.infer<typeof MediaAnchorSchema>;
/** `MediaNode` type. */
export type MediaNode = z.infer<typeof MediaNodeSchema>;
/** `CaptionTrack` type. */
export type CaptionTrack = z.infer<typeof CaptionTrackSchema>;
/** `BranchChoice` type. */
export type BranchChoice = z.infer<typeof BranchChoiceSchema>;
/** `BranchNode` type. */
export type BranchNode = z.infer<typeof BranchNodeSchema>;
/** `InfoNode` type. */
export type InfoNode = z.infer<typeof InfoNodeSchema>;
/** `CustomNode` type. */
export type CustomNode = z.infer<typeof CustomNodeSchema>;
/** `Card` type. */
export type Card = z.infer<typeof CardSchema>;
/** Mode of `Cards`. */
export type CardsMode = z.infer<typeof CardsModeSchema>;
/** `CardsNode` type. */
export type CardsNode = z.infer<typeof CardsNodeSchema>;
/** `Hotspot` type. */
export type Hotspot = z.infer<typeof HotspotSchema>;
/** `HotspotNode` type. */
export type HotspotNode = z.infer<typeof HotspotNodeSchema>;
/** `LernoNode` type. */
export type LernoNode = z.infer<typeof NodeSchema>;
/** `LernoDocument` type. */
export type LernoDocument = z.infer<typeof LernoDocumentSchema>;

/** Input types before defaults are applied (for builders). */
export type LernoNodeInput = z.input<typeof NodeSchema>;
/** `LernoDocumentInput` type. */
export type LernoDocumentInput = z.input<typeof LernoDocumentSchema>;
/** `QuestionItemInput` type. */
export type QuestionItemInput = z.input<typeof QuestionItemSchema>;
/** `SlideBlockInput` type. */
export type SlideBlockInput = z.input<typeof SlideBlockSchema>;
/** `MediaAnchorInput` type. */
export type MediaAnchorInput = z.input<typeof MediaAnchorSchema>;
/** `CardInput` type. */
export type CardInput = z.input<typeof CardSchema>;
/** `HotspotInput` type. */
export type HotspotInput = z.input<typeof HotspotSchema>;
