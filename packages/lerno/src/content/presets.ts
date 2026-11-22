import { defineDocument } from './document';
import type {
  CardsMode,
  DocumentMetadata,
  HotspotInput,
  LernoDocument,
  LernoNodeInput,
  MediaAnchorInput,
  QuestionItemInput,
  SlideBlockInput,
} from './schema';

/**
 * Content type presets.
 * A content type is a preset of the node archetypes in the core. These helpers
 * only assemble the right nodes and flow; there is no separate engine.
 */

export type MetadataInit = { title: string } & Partial<Omit<DocumentMetadata, 'title'>>;

/** Options accepted by `Preset`. */
export interface PresetOptions {
  type?: string;
  scoring?: LernoDocument['scoring'];
  assets?: LernoDocument['assets'];
  theme?: LernoDocument['theme'];
}

/**
 * Assembles a document from preset arguments.
 * All preset helpers funnel through this function, so every preset produces a
 * document that satisfies the same schema.
 * @param id - Unique document id.
 * @param type - Content type recorded on the document.
 * @param metadata - Title, subject, and grade of the lesson.
 * @param nodes - Node inputs converted to schema nodes.
 * @param options - Scoring and asset settings.
 * @param flowMode - How the session advances between nodes.
 * @returns A validated document.
 */
function build(id: string, type: string, metadata: MetadataInit, nodes: LernoNodeInput[], options: PresetOptions, flowMode: 'linear' | 'graph' | 'adaptive' = 'linear'): LernoDocument {
  return defineDocument({
    id,
    type: options.type ?? type,
    metadata,
    nodes,
    flow: { mode: flowMode },
    ...(options.scoring ? { scoring: options.scoring } : {}),
    ...(options.assets ? { assets: options.assets } : {}),
    ...(options.theme ? { theme: options.theme } : {}),
  });
}

/**
 * Builds a linear assessment document.
 * @param id - Unique document id.
 * @param metadata - Title, subject, and grade of the lesson.
 * @param items - Question items answered in order.
 * @param options - Scoring and asset settings.
 * @returns A document with one question node per item.
 */
export function questionSet(id: string, metadata: MetadataInit, items: QuestionItemInput[], options: PresetOptions = {}): LernoDocument {
  const nodes: LernoNodeInput[] = items.map((item, index) => ({
    id: `q${index + 1}`,
    type: 'question',
    item,
  }));
  return build(id, 'question-set', metadata, nodes, options);
}

/** Course Presentation — interaktif slayt dizisi. */
export function coursePresentation(
  id: string,
  metadata: MetadataInit,
  slides: { id?: string; title?: string; blocks: SlideBlockInput[] }[],
  options: PresetOptions = {},
): LernoDocument {
  const nodes: LernoNodeInput[] = slides.map((slide, index) => ({
    id: slide.id ?? `slide-${index + 1}`,
    type: 'slide',
    title: slide.title,
    blocks: slide.blocks,
  }));
  return build(id, 'course-presentation', metadata, nodes, options);
}

/**
 * Builds a chaptered reading document.
 * Chapters become slide nodes, so progress and scoring follow the linear flow.
 * @returns A document with one slide node per chapter.
 */
export function interactiveBook(
  id: string,
  metadata: MetadataInit,
  chapters: { id?: string; title?: string; blocks: SlideBlockInput[] }[],
  options: PresetOptions = {},
): LernoDocument {
  const document = coursePresentation(id, metadata, chapters, { ...options, type: options.type ?? 'interactive-book' });
  return document;
}

/**
 * Builds a video document whose anchors pause playback for questions or notes.
 * @returns A document holding the media node and its time-stamped anchors.
 */
export function interactiveVideo(
  id: string,
  metadata: MetadataInit,
  assetId: string,
  anchors: MediaAnchorInput[],
  options: PresetOptions = {},
): LernoDocument {
  return build(id, 'interactive-video', metadata, [{ id: 'video', type: 'media', assetId, anchors }], options);
}

/**
 * Builds a document whose next node is chosen by the learner.
 * @param id - Unique document id.
 * @param metadata - Title, subject, and grade of the lesson.
 * @param nodes - Node inputs including branch nodes with their choices.
 * @param options - Scoring and asset settings.
 * @returns A document whose flow mode is graph.
 */
export function branchingScenario(id: string, metadata: MetadataInit, nodes: LernoNodeInput[], options: PresetOptions = {}): LernoDocument {
  return build(id, 'branching-scenario', metadata, nodes, options, 'graph');
}

/** Dialog Cards / Flashcards / Memory Game. */
export function cardsDeck(
  id: string,
  metadata: MetadataInit,
  cards: { id?: string; front: string; back: string }[],
  mode: CardsMode = 'flip',
  options: PresetOptions = {},
): LernoDocument {
  return build(
    id,
    'cards',
    metadata,
    [
      {
        id: 'cards',
        type: 'cards',
        mode,
        title: metadata.title,
        cards: cards.map((card, index) => ({ id: card.id ?? `card-${index + 1}`, front: card.front, back: card.back })),      },
    ],
    options,
  );
}

/** Image Hotspots / Find the Hotspot. */
export function hotspotImage(
  id: string,
  metadata: MetadataInit,
  assetId: string,
  spots: HotspotInput[],
  mode: 'explore' | 'find' = 'explore',
  options: PresetOptions = {},
): LernoDocument {
  return build(id, 'hotspot', metadata, [{ id: 'hotspot', type: 'hotspot', assetId, mode, title: metadata.title, spots }], options);
}

/**
 * Builds an informational document with panels and no grading.
 * @returns A document with one info node holding the panels.
 */
export function infoPage(
  id: string,
  metadata: MetadataInit,
  panels: { title: string; body: string; icon?: string }[],
  options: PresetOptions = {},
): LernoDocument {
  return build(id, 'info', metadata, [{ id: 'info', type: 'info', title: metadata.title, panels }], options);
}

/** Shape of `VirtualLabStep`. */
export interface VirtualLabStep {
  instruction: string;
  question?: QuestionItemInput;
}

/**
 * Guided lab sequence that pairs a setup note with instructions and questions.
 * The learner changes a parameter, observes the result, and answers a question for
 * each step.
 */
export function virtualLab(
  id: string,
  metadata: MetadataInit,
  config: { setup: string; title?: string; steps: VirtualLabStep[] },
  options: PresetOptions = {},
): LernoDocument {
  const nodes: LernoNodeInput[] = [
    {
      id: 'lab',
      type: 'slide',
      title: config.title ?? metadata.title,
      blocks: [{ type: 'text', markdown: config.setup }],
    },
  ];

  config.steps.forEach((step, index) => {
    nodes.push({
      id: `step-${index + 1}`,
      type: 'slide',
      title: `Step ${index + 1}`,
      blocks: [{ type: 'text', markdown: step.instruction }],
    });
    if (step.question) {
      nodes.push({ id: `step-${index + 1}-q`, type: 'question', item: step.question });
    }
  });

  return build(id, 'virtual-lab', metadata, nodes, options);
}
