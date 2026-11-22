/** Shape of `AtomNode`. */
export interface AtomNode {
  id: string;
  symbol: string;
  x: number;
  y: number;
  charge?: string; // e.g. "+", "-", "δ+", "δ-"
  color?: string;
  radius?: number;
}
/** Shape of `ChemicalBond`. */
export interface ChemicalBond {
  fromId: string;
  toId: string;
  order: 1 | 2 | 3; // single, double, triple bond
  color?: string;
}

/**
 * Two-dimensional molecule geometry holding atoms and the bonds between them.
 * The view reads positions only; polarity and bond order are plain data.
 */
export class Molecule2D {
  public name: string;
  public formula: string;
  public atoms: AtomNode[];
  public bonds: ChemicalBond[];

  /**
   * Creates a molecule.
   * @param name - Display name, such as Carbon dioxide.
   * @param formula - Chemical formula shown next to the drawing.
   * @param atoms - Atom positions with element, color, and charge.
   * @param bonds - Bonds referencing atoms by index.
   */
  constructor(name: string, formula: string, atoms: AtomNode[] = [], bonds: ChemicalBond[] = []) {
    this.name = name;
    this.formula = formula;
    this.atoms = atoms;
    this.bonds = bonds;
  }

  /**
   * Factory for Water Molecule (H2O, 104.5 degree bent geometry)
   */
  static createWater(centerX = 960, centerY = 540, scale = 120): Molecule2D {
    const angleRad = (104.5 * Math.PI) / 180 / 2; // half angle from vertical

    const oX = centerX;
    const oY = centerY;

    const h1X = centerX - scale * Math.sin(angleRad);
    const h1Y = centerY + scale * Math.cos(angleRad);

    const h2X = centerX + scale * Math.sin(angleRad);
    const h2Y = centerY + scale * Math.cos(angleRad);

    return new Molecule2D(
      'Su',
      'H2O',
      [
        { id: 'O', symbol: 'O', x: oX, y: oY, charge: 'δ-', color: '#EF4444', radius: 36 },
        { id: 'H1', symbol: 'H', x: h1X, y: h1Y, charge: 'δ+', color: '#3B82F6', radius: 24 },
        { id: 'H2', symbol: 'H', x: h2X, y: h2Y, charge: 'δ+', color: '#3B82F6', radius: 24 },
      ],
      [
        { fromId: 'O', toId: 'H1', order: 1 },
        { fromId: 'O', toId: 'H2', order: 1 },
      ],
    );
  }

  /**
   * Builds the linear carbon dioxide molecule.
   * @param centerX - Center x-coordinate of the carbon atom.
   * @param centerY - Center y-coordinate of the carbon atom.
   * @param scale - Distance between bonded atoms.
   * @returns The ready-to-draw molecule.
   */
  static createCarbonDioxide(centerX = 480, centerY = 270, scale = 140): Molecule2D {
    return new Molecule2D(
      'Karbondioksit',
      'CO2',
      [
        { id: 'C', symbol: 'C', x: centerX, y: centerY, color: '#334155', radius: 34 },
        { id: 'O1', symbol: 'O', x: centerX - scale, y: centerY, charge: 'δ-', color: '#EF4444', radius: 28 },
        { id: 'O2', symbol: 'O', x: centerX + scale, y: centerY, charge: 'δ-', color: '#EF4444', radius: 28 },
      ],
      [
        { fromId: 'C', toId: 'O1', order: 2 },
        { fromId: 'C', toId: 'O2', order: 2 },
      ],
    );
  }

  /**
   * Builds the tetrahedral methane molecule.
   * @param centerX - Center x-coordinate of the carbon atom.
   * @param centerY - Center y-coordinate of the carbon atom.
   * @param scale - Distance between bonded atoms.
   * @returns The ready-to-draw molecule.
   */
  static createMethane(centerX = 480, centerY = 270, scale = 130): Molecule2D {
    const angles = [90, 210, 330, 30];
    const atoms: AtomNode[] = [{ id: 'C', symbol: 'C', x: centerX, y: centerY, color: '#334155', radius: 34 }];
    const bonds: ChemicalBond[] = [];

    angles.forEach((degrees, index) => {
      const rad = (degrees * Math.PI) / 180;
      const id = `H${index + 1}`;
      atoms.push({
        id,
        symbol: 'H',
        x: centerX + Math.cos(rad) * scale,
        y: centerY - Math.sin(rad) * scale,
        color: '#3B82F6',
        radius: 22,
      });
      bonds.push({ fromId: 'C', toId: id, order: 1 });
    });

    return new Molecule2D('Metan', 'CH4', atoms, bonds);
  }

  /**
   * Builds the trigonal pyramidal ammonia molecule, including the lone-pair charge.
   * @param centerX - Center x-coordinate of the nitrogen atom.
   * @param centerY - Center y-coordinate of the nitrogen atom.
   * @param scale - Distance between bonded atoms.
   * @returns The ready-to-draw molecule.
   */
  static createAmmonia(centerX = 480, centerY = 250, scale = 130): Molecule2D {
    const angles = [210, 330, 90];
    const atoms: AtomNode[] = [
      { id: 'N', symbol: 'N', x: centerX, y: centerY, charge: 'δ-', color: '#6366F1', radius: 34 },
    ];
    const bonds: ChemicalBond[] = [];

    angles.forEach((degrees, index) => {
      const rad = (degrees * Math.PI) / 180;
      const id = `H${index + 1}`;
      atoms.push({
        id,
        symbol: 'H',
        x: centerX + Math.cos(rad) * scale,
        y: centerY - Math.sin(rad) * scale,
        charge: 'δ+',
        color: '#3B82F6',
        radius: 22,
      });
      bonds.push({ fromId: 'N', toId: id, order: 1 });
    });

    return new Molecule2D('Amonyak', 'NH3', atoms, bonds);
  }

  /**
   * Generates SVG elements for atoms and bonds.
   */
  renderSvgElements() {
    const atomMap = new Map(this.atoms.map((a) => [a.id, a]));

    const bondLines: { x1: number; y1: number; x2: number; y2: number; order: number }[] = [];
    for (const b of this.bonds) {
      const from = atomMap.get(b.fromId);
      const to = atomMap.get(b.toId);
      if (from && to) {
        bondLines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, order: b.order });
      }
    }

    return { atoms: this.atoms, bonds: bondLines };
  }
}
