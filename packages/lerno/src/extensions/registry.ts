import { defaultQuestions, type QuestionDefinition } from '../grading/grader';
import { graphFlow, linearFlow } from '../runtime/flows';
import { createHost, type FlowResolver, type LernoHost } from './host';

/** Shape of `NodeDefinition`. */
export interface NodeDefinition {
  type: string;
  label?: string;
}

/** Component type validated by the runtime; rendering lives in the UI package. */
export interface ComponentDefinition {
  type: string;
  version: number;
  label?: string;
}

/**
 * Extension registry.
 * The core only recognizes types registered here, so adding a node, question,
 * question, or flow ships as a new package instead of changing the core.
 */
export interface LernoRegistry {
  readonly nodes: Map<string, NodeDefinition>;
  readonly questions: Map<string, QuestionDefinition>;
  readonly flows: Map<string, FlowResolver>;
  readonly components: Map<string, ComponentDefinition>;
  /**
   * Registers a node archetype by its type name.
   * @param definition - Type name, schema, and the view factory for that type.
   */
  addNode(definition: NodeDefinition): void;
  /**
   * Registers a question kind by its name.
   * @param definition - Kind name, schema, and the grader for that kind.
   */
  addQuestion(definition: QuestionDefinition): void;
  /**
   * Registers a named flow resolver used by adaptive documents.
   * @param id - Flow name referenced by a document.
   * @param resolver - Returns the next node id for a session, or null to fall back to linear order.
   */
  addFlow(id: string, resolver: FlowResolver): void;
  /**
   * Registers a component type the player may render.
   * @param definition - Type name and the version the runtime implements.
   */
  addComponent(definition: ComponentDefinition): void;
}

/** A Lerno extension. `setup` touches only the registry and host. */
export interface LernoExtension {
  name: string;
  /**
   * Extension entry point called once while the host is assembled.
   * @param registry - Registry the extension may write into.
   * @param host - Mutable host that the extension replaces or wraps.
   */
  setup(registry: LernoRegistry, host: LernoHost): void;
}

const BUILTIN_NODES: NodeDefinition[] = [
  { type: 'slide', label: 'Slide' },
  { type: 'question', label: 'Question' },
  { type: 'media', label: 'Media' },
  { type: 'branch', label: 'Branch' },
  { type: 'info', label: 'Info' },
  { type: 'cards', label: 'Cards' },
  { type: 'hotspot', label: 'Image hotspot' },
  { type: 'custom', label: 'Extension node' },
];

/**
 * Builds a registry preloaded with the built-in nodes and questions.
 * @returns A registry that can be extended before the first document loads.
 */
export function createRegistry(): LernoRegistry {
  const nodes = new Map<string, NodeDefinition>();
  const questions = new Map<string, QuestionDefinition>();
  const flows = new Map<string, FlowResolver>();
  const components = new Map<string, ComponentDefinition>();

  const registry: LernoRegistry = {
    nodes,
    questions,
    flows,
    components,
    addNode: (definition) => {
      nodes.set(definition.type, definition);
    },
    addQuestion: (definition) => {
      questions.set(definition.kind, definition);
    },
    addFlow: (id, resolver) => {
      flows.set(id, resolver);
    },
    addComponent: (definition) => {
      components.set(definition.type, definition);
    },
  };

  for (const definition of BUILTIN_NODES) registry.addNode(definition);
  for (const definition of defaultQuestions) registry.addQuestion(definition);
  registry.addFlow('linear', linearFlow);
  registry.addFlow('graph', graphFlow);

  return registry;
}

/**
 * Identity helper that gives an extension literal its type.
 * @param extension - Extension literal with a name and a setup function.
 * @returns The same object, narrowed to LernoExtension.
 */
export function defineExtension(extension: LernoExtension): LernoExtension {
  return extension;
}

/** Options accepted by `Lerno`. */
export interface LernoOptions {
  extensions?: LernoExtension[];
  host?: Partial<LernoHost>;
}

/** Shape of `LernoInstance`. */
export interface LernoInstance {
  registry: LernoRegistry;
  host: LernoHost;
}

/**
 * Assembles a fully configured instance from extensions and a host.
 * @param options - Host overrides and the extension list, applied in order.
 * @returns The registry and host pair that the application drives.
 */
export function createLerno(options: LernoOptions = {}): LernoInstance {
  const host = createHost(options.host);
  const registry = createRegistry();

  for (const extension of options.extensions ?? []) {
    extension.setup(registry, host);
  }

  return { registry, host };
}
