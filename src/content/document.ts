import { z } from 'zod';
import { migrateDocument } from './migrations';
import {
  LernoDocumentSchema,
  type LernoDocument,
  type LernoNode,
  type QuestionItem,
} from './schema';

/** Shape of `QuestionRef`. */
export interface QuestionRef {
  /** Answer key: node id for questions, anchor id for media anchors. */
  id: string;
  nodeId: string;
  item: QuestionItem;
  points: number;
}

/**
 * Error thrown when a document fails schema validation.
 */
export class LernoValidationError extends Error {
  /**
   * Creates the error with the offending issues.
   * @param issues - Zod issues describing each failure, in input order.
   */
  constructor(
    message: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(message);
    this.name = 'LernoValidationError';
  }
}

/**
 * Validates an input value against the document schema and returns it typed.
 * Data coming from JSON is checked once here; everything inside is type-safe.
 * @throws LernoValidationError When validation fails.
 */
export function defineDocument(input: unknown): LernoDocument {
  const result = LernoDocumentSchema.safeParse(migrateDocument(input));
  if (!result.success) {
    throw new LernoValidationError('Invalid Lerno document', result.error.issues);
  }
  return result.data;
}

/**
 * Validates an unknown value against the document schema.
 * @param input - Raw data, typically parsed JSON.
 * @returns A discriminated result carrying either the document or the issue list.
 */
export function parseDocument(input: unknown):
  | { success: true; document: LernoDocument }
  | { success: false; issues: z.core.$ZodIssue[] } {
  const result = LernoDocumentSchema.safeParse(input);
  if (!result.success) return { success: false, issues: result.error.issues };
  return { success: true, document: result.data };
}

/**
 * Finds a node by id.
 * @param document - Document to search.
 * @param nodeId - Id of the node.
 * @returns The node, or undefined when the id is unknown.
 */
export function getNode(document: LernoDocument, nodeId: string): LernoNode | undefined {
  return document.nodes.find((node) => node.id === nodeId);
}

/**
 * Finds the position of a node in document order.
 * @param document - Document to search.
 * @param nodeId - Id of the node.
 * @returns The zero-based index, or -1 when the id is unknown.
 */
export function getNodeIndex(document: LernoDocument, nodeId: string): number {
  return document.nodes.findIndex((node) => node.id === nodeId);
}

/**
 * Lists every question in the document, including questions inside virtual labs.
 * @param document - Document to scan.
 * @returns Question references with their node id, point value, and item.
 */
export function collectQuestions(document: LernoDocument): QuestionRef[] {
  const collected: QuestionRef[] = [];

  for (const node of document.nodes) {
    if (node.type === 'question') {
      collected.push({ id: node.id, nodeId: node.id, item: node.item, points: node.points });
      continue;
    }
    if (node.type === 'media') {
      for (const anchor of node.anchors) {
        if (anchor.item) {
          collected.push({ id: anchor.id, nodeId: node.id, item: anchor.item, points: 1 });
        }
      }
    }
  }

  return collected;
}

/**
 * Reads the point value a node contributes to the session score.
 * @param node - Node to inspect.
 * @returns The points, or zero for nodes that cannot be graded.
 */
export function getNodePoints(node: LernoNode): number {
  switch (node.type) {
    case 'question':
      return node.points;
    case 'media':
      return node.anchors.filter((anchor) => anchor.item).length;
    default:
      return 0;
  }
}

/**
 * Sums the point value of every question in the document.
 * @param document - Document to total.
 * @returns The full score available in one pass.
 */
export function getDocumentPoints(document: LernoDocument): number {
  return document.nodes.reduce((total, node) => total + getNodePoints(node), 0);
}
