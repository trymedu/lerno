'use client';

import type { CSSProperties, PointerEventHandler, ReactNode } from 'react';
import type { Node, RenderElement } from '@medu/lerno';
import { getNodeRenderer } from './registry.js';
import { estimateMathWidth, renderLatex } from './math.js';

/** Props of {@link Display}. */
export interface DisplayProps {
  /** Root of the scene graph to draw. */
  node: Node;
  /** Width of the SVG view box in scene units. Defaults to `960`. */
  width?: number;
  /** Height of the SVG view box in scene units. Defaults to `540`. */
  height?: number;
  /** Class applied to the root `<svg>` element. */
  className?: string;
  /** Inline style applied to the root `<svg>` element. */
  style?: CSSProperties;
  /** Background color of the view box. Defaults to transparent. */
  backgroundColor?: string;
  /** Accessible name announced for the scene. Defaults to `Lerno sahnesi`. */
  title?: string;
}

interface SvgCommon {
  transform?: string;
  opacity?: number;
  display?: string;
  pointerEvents?: 'all';
  cursor?: string;
  onPointerDown?: PointerEventHandler<SVGElement>;
  onPointerMove?: PointerEventHandler<SVGElement>;
  onPointerUp?: PointerEventHandler<SVGElement>;
}

/**
 * Maps transform, opacity, visibility, and pointer handlers onto shared SVG
 * attributes.
 *
 * Pointer forwarding is enabled only for elements that carry a source node, so
 * idle drawing never pays for event listeners.
 *
 * @param element - Lowered render element being drawn.
 * @returns Attributes merged into the element's props.
 */
function common(element: RenderElement): SvgCommon {
  const props: SvgCommon = {};
  if (element.transform) props.transform = element.transform;
  if (element.opacity !== undefined) props.opacity = element.opacity;
  if (element.visible === false) props.display = 'none';

  const source = element.source;
  if (source && source.inputEnabled) {
    props.pointerEvents = 'all';
    props.cursor = 'grab';
    props.onPointerDown = (event) => {
      event.currentTarget.setPointerCapture?.(event.pointerId);
      source.handlePointer('down', { x: event.clientX, y: event.clientY, originalEvent: event });
    };
    props.onPointerMove = (event) => source.handlePointer('move', { x: event.clientX, y: event.clientY, originalEvent: event });
    props.onPointerUp = (event) => source.handlePointer('up', { x: event.clientX, y: event.clientY, originalEvent: event });
  }
  return props;
}

/**
 * Recursively lowers one render element into React elements.
 *
 * Custom nodes are delegated to the renderer registry; elements with no entry
 * render nothing rather than throwing, so an unknown extension degrades to an
 * empty space.
 *
 * @param element - Element to draw.
 * @param key - React key derived from the element's position in its parent.
 * @returns React elements representing the element and its children.
 */
function renderElement(element: RenderElement, key: number): ReactNode {
  switch (element.type) {
    case 'group':
      return (
        <g key={key} {...common(element)}>
          {element.children.map((child, index) => renderElement(child, index))}
        </g>
      );
    case 'rect':
      return (
        <rect
          key={key}
          {...common(element)}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={element.radius}
          fill={element.fill ?? 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'circle':
      return (
        <circle
          key={key}
          {...common(element)}
          cx={element.centerX}
          cy={element.centerY}
          r={element.radius}
          fill={element.fill ?? 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
    case 'line':
      return (
        <line
          key={key}
          {...common(element)}
          x1={element.x1}
          y1={element.y1}
          x2={element.x2}
          y2={element.y2}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          strokeDasharray={element.dash}
        />
      );
    case 'path':
      return (
        <path
          key={key}
          {...common(element)}
          d={element.shape.pathData}
          fill={element.fill ?? 'none'}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          strokeDasharray={element.dash}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case 'text':
      return (
        <text
          key={key}
          {...common(element)}
          x={element.x}
          y={element.y}
          fill={element.fill}
          fontSize={element.fontSize}
          fontWeight={element.fontWeight}
          textAnchor={element.anchor}
          dominantBaseline={element.baseline}
        >
          {element.text}
        </text>
      );
    case 'image':
      return <image key={key} {...common(element)} href={element.href} x={element.x} y={element.y} width={element.width} height={element.height} />;
    case 'math': {
      const size = element.fontSize ?? 16;
      const interactive = Boolean(element.source?.inputEnabled);
      const dx = element.anchor === 'end' ? '-100%' : element.anchor === 'start' ? '0%' : '-50%';
      return (
        <foreignObject
          key={key}
          {...common(element)}
          x={element.x}
          y={element.y}
          width={estimateMathWidth(element.latex, size)}
          height={size * 2.4}
          pointerEvents={interactive ? undefined : 'none'}
          style={{ overflow: 'visible' }}
        >
          <div
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              color: element.fill,
              fontSize: `${size}px`,
              lineHeight: 1,
              transform: `translate(${dx}, -50%)`,
            }}
            dangerouslySetInnerHTML={{ __html: renderLatex(element.latex) }}
          />
        </foreignObject>
      );
    }
    case 'extension': {
      const renderer = getNodeRenderer(element.rendererId);
      return (
        <g key={key} {...common(element)}>
          {renderer ? renderer(element.data) : null}
        </g>
      );
    }
    default:
      return null;
  }
}

/**
 * Draws a scene graph as an SVG element.
 *
 * The framework-agnostic render tree returned by `node.toRender()` is lowered
 * into React elements directly; custom nodes resolve through
 * {@link registerNodeRenderer}.
 *
 * @param props - Root node, view box size, styling, and accessible name.
 * @returns An `<svg>` element drawing the current state of the scene graph.
 */
export function Display({ node, width = 960, height = 540, className, style, backgroundColor, title }: DisplayProps) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title ?? 'Lerno scene'}
      className={className}
      style={{ display: 'block', width: '100%', height: 'auto', background: backgroundColor, touchAction: 'none', ...style }}
    >
      {renderElement(node.toRender(), 0)}
    </svg>
  );
}
