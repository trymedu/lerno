'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ProgressBar, Surface } from '@heroui/react';
import { type LernoDocument, type LernoExtension, type LernoNode, type SlideBlock, type VariableValue } from '@medu/lerno';
import { ActionButton } from '../components/Controls.js';
import type { LernoComponentMap, LayerTone } from '../components/component-types.js';
import { componentVersionErrors, createComponentMap, missingComponentTypes } from '../components/registry.js';
import { customNodeKey, type CustomNodeRendererMap } from './node-renderers.js';
import { controlBar, sceneColors } from '../theme.js';
import { CardsView } from './CardsView.js';
import { HotspotView } from './HotspotView.js';
import { InteractiveVideo } from './InteractiveVideo.js';
import { QuestionView } from './QuestionView.js';
import { useLessonStage, type UseLessonStageOptions } from './useLessonStage.js';

/** Props accepted by `LernoPlayer`. */
export interface LernoPlayerProps {
  document: LernoDocument;
  host?: UseLessonStageOptions['host'];
  extensions?: LernoExtension[];
  className?: string;
  style?: CSSProperties;
  /** Component map used by video layers. */
  components?: LernoComponentMap;
  /** Light or dark layer surface. */
  tone?: LayerTone;
  /** Application renderers for `custom` nodes. */
  nodeRenderers?: CustomNodeRendererMap;
  /** Registered component versions; built-ins are used when omitted. */
  componentVersions?: Record<string, number>;
}

/**
 * Plays a Lerno document from the first node to the end.
 * Navigation, grading, and scoring are handled by the session; this component
 * only renders the current node and the surrounding chrome.
 */
export function LernoPlayer({ document, host, extensions, className, style, components, tone, nodeRenderers, componentVersions }: LernoPlayerProps) {
  const { stage, sessionState: state, host: resolvedHost, answer, setVariable, next, back, choose, reset } = useLessonStage(document, {
    host,
    extensions,
  });
  const session = stage.session;
  const layerComponents = components ?? createComponentMap();
  const variables: Record<string, VariableValue> = state.variables;
  const componentIssues = [
    ...missingComponentTypes(document, layerComponents).map((type) => `Component not registered: ${type}`),
    ...componentVersionErrors(document, componentVersions),
  ];

  const node = document.nodes.find((entry) => entry.id === state.cursor);
  const score = session.score();
  const progress = document.nodes.length > 0 ? state.visited.length / document.nodes.length : 0;
  const showChrome = document.nodes.length > 1;

  function resolveAsset(assetId: string): string {
    const asset = document.assets.find((entry) => entry.id === assetId);
    return resolvedHost.media.resolve(assetId) ?? asset?.src ?? '';
  }

  function renderBlock(block: SlideBlock, key: number): ReactNode {
    switch (block.type) {
      case 'heading':
        return (
          <h3 key={key} className={block.level === 1 ? 'm-0 text-xl font-semibold text-foreground' : 'm-0 text-lg font-semibold text-foreground'}>
            {block.text}
          </h3>
        );
      case 'text':
        return (
          <p key={key} className="m-0 text-sm leading-relaxed text-muted">
            {block.markdown}
          </p>
        );
      case 'image':
        return (
          <figure key={key} className="m-0 flex flex-col gap-1.5">
            <img src={resolveAsset(block.assetId)} alt={block.caption ?? ''} className="w-full rounded-2xl" />
            {block.caption ? <figcaption className="text-xs text-muted">{block.caption}</figcaption> : null}
          </figure>
        );
      case 'callout': {
        const tone =
          block.tone === 'danger'
            ? sceneColors.danger
            : block.tone === 'warning'
              ? sceneColors.accent
              : block.tone === 'success'
                ? sceneColors.success
                : sceneColors.primary;
        return (
          <div key={key} className="rounded-2xl p-3 text-sm text-foreground" style={{ background: sceneColors.surfaceSoft, borderLeft: `3px solid ${tone}` }}>
            {block.body}
          </div>
        );
      }
      default:
        return null;
    }
  }

  function renderNode(current: LernoNode): ReactNode {
    switch (current.type) {
      case 'slide':
        return (
          <div className="flex flex-col gap-4">
            {current.title ? <h2 className="m-0 text-xl font-semibold text-foreground">{current.title}</h2> : null}
            {current.blocks.map((block, index) => renderBlock(block, index))}
          </div>
        );

      case 'question':
        return (
          <QuestionView
            item={current.item}
            outcome={state.answers[current.id]?.outcome}
            onAnswer={(response) => answer(current.id, response)}
          />
        );

      case 'media': {
        const src = resolveAsset(current.assetId);
        if (current.anchors.length > 0 || current.layers.length > 0) {
          return (
            <InteractiveVideo
              node={current}
              src={src}
              stage={stage}
              manifest={document.components}
              componentVersions={componentVersions}
              variables={variables}
              onVariableChange={setVariable}
              components={layerComponents}
              tone={tone}
              answerFor={(anchorId) => state.answers[anchorId]?.outcome}
              onAnswer={(anchorId, response) => answer(anchorId, response)}
            />
          );
        }
        return src ? <video src={src} controls className="w-full rounded-2xl" /> : <p className="text-sm text-muted">Medya bulunamadı.</p>;
      }

      case 'cards':
        return <CardsView node={current} />;

      case 'hotspot':
        return <HotspotView node={current} src={resolveAsset(current.assetId)} />;

      case 'branch':
        return (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-base font-semibold text-foreground">{current.prompt}</p>
            <div className="flex flex-wrap gap-3">
              {current.choices.map((choice) => (
                <ActionButton key={choice.id} onPress={() => choose(current.id, choice.id)}>
                  {choice.label}
                </ActionButton>
              ))}
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="flex flex-col gap-4">
            {current.title ? <h2 className="m-0 text-xl font-semibold text-foreground">{current.title}</h2> : null}
            {current.panels.map((panel) => (
              <Surface key={panel.title} className="flex flex-col gap-1 rounded-2xl p-4" variant="secondary">
                <span className="text-sm font-semibold text-foreground">{panel.title}</span>
                <span className="text-sm text-muted">{panel.body}</span>
              </Surface>
            ))}
          </div>
        );

      case 'custom': {
        const Renderer = nodeRenderers?.[customNodeKey(current)] ?? nodeRenderers?.[current.kind];
        if (Renderer) {
          return <Renderer node={current} variables={state.variables} setVariable={setVariable} stage={stage} />;
        }
        return (
          <p className="text-sm text-muted">
            No viewer registered for the “{current.extension}:{current.kind}” node.
          </p>
        );
      }

      default:
        return null;
    }
  }

  return (
    <Surface className={`flex flex-col gap-5 rounded-3xl p-5 ${className ?? ''}`} variant="default" style={style}>
      {showChrome ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">{document.metadata.title}</span>
            <span className="text-xs text-muted tabular-nums">
              {state.visited.length}/{document.nodes.length}
              {score.max > 0 ? ` · ${score.earned}/${score.max} points` : ''}
            </span>
          </div>
          <ProgressBar aria-label="Progress" value={Math.round(progress * 100)} className="w-full">
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>
      ) : null}

      {componentIssues.length > 0 ? (
        <div role="alert" className="flex flex-col gap-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {componentIssues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}

      <div className="min-h-[120px]">{node ? renderNode(node) : <p className="text-sm text-muted">Node not found.</p>}</div>

      {showChrome ? (
        <div className={controlBar}>
          <ActionButton variant="ghost" onPress={back} isDisabled={state.visited.length <= 1}>
            Back
          </ActionButton>
          <ActionButton onPress={() => next()} isDisabled={node?.type === 'branch' || state.status === 'completed'}>
            {state.status === 'completed' ? 'Completed' : 'Next'}
          </ActionButton>
          <ActionButton variant="ghost" onPress={reset}>
            Restart
          </ActionButton>
        </div>
      ) : null}
    </Surface>
  );
}
