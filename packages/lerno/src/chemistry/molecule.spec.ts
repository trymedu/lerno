import { Molecule2D } from './molecule';

describe('Molecule2D', () => {
  it('should build H2O molecule with 3 atoms and 2 covalent bonds', () => {
    const water = Molecule2D.createWater(500, 300, 100);
    expect(water.atoms).toHaveLength(3);
    expect(water.bonds).toHaveLength(2);

    const rendered = water.renderSvgElements();
    expect(rendered.atoms).toHaveLength(3);
    expect(rendered.bonds).toHaveLength(2);
    expect(rendered.bonds[0].order).toBe(1);
  });
});
