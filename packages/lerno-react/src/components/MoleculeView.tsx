'use client';

import type { Molecule2D } from '@medu/lerno';

import { sceneColors } from '../theme.js';
/** Props accepted by `MoleculeView`. */
export interface MoleculeViewProps {
  molecule: Molecule2D;
}

/**
 * Draws atoms, bonds, charges, and formula labels of a molecule.
 * Positions come from the molecule object, so the view never computes geometry.
 */
export function MoleculeView({ molecule }: MoleculeViewProps) {
  const { atoms, bonds } = molecule.renderSvgElements();

  return (
    <g className="lerno-molecule">
      {bonds.map((bond, index) => (
        <line
          key={`bond-${index}`}
          x1={bond.x1}
          y1={bond.y1}
          x2={bond.x2}
          y2={bond.y2}
          stroke={sceneColors.axis}
          strokeWidth={bond.order * 4}
          strokeLinecap="round"
        />
      ))}

      {atoms.map((atom) => {
        const radius = atom.radius ?? 24;
        return (
          <g key={atom.id}>
            <circle cx={atom.x} cy={atom.y} r={radius} fill={atom.color ?? sceneColors.primary} />
            <text
              x={atom.x}
              y={atom.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={radius * 0.9}
              fontWeight={700}
              fill="#ffffff"
            >
              {atom.symbol}
            </text>
            {atom.charge ? (
              <text
                x={atom.x + radius}
                y={atom.y - radius}
                fill={sceneColors.text}
                fontSize={16}
                fontWeight={600}
              >
                {atom.charge}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
