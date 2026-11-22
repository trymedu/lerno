import { Property } from '../axon';
import { v2 } from '../dot';
import { Node, RectNode } from '../scenery';
import { animateNumber } from '../twixt';
import { Clock, Sim, createScreen } from './sim';

describe('Clock', () => {
  it('counts time and frames', () => {
    const clock = new Clock();
    clock.step(0.5);
    clock.step(0.5);
    expect(clock.elapsed).toBe(1);
    expect(clock.frame).toBe(2);
    clock.reset();
    expect(clock.elapsed).toBe(0);
  });
});

describe('SimScreen', () => {
  it('advances the model step and produces a view', () => {
    let stepped = 0;
    class Model {
      step(dt: number): void {
        stepped += dt;
      }
    }
    const screen = createScreen('Test', () => new Model(), () => new Node());
    screen.createModel();
    const view = screen.createView();
    screen.step(0.25);
    expect(view).toBeInstanceOf(Node);
    expect(stepped).toBe(0.25);
  });
});

describe('Sim', () => {
  it('advances every screen and runs the clock', () => {
    const value = new Property(0);
    class Model {
      step(_dt: number): void {
        value.set(value.get() + 1);
      }
    }
    const screen = createScreen('S', () => new Model(), () => new RectNode(0, 0, 10, 10));
    const sim = new Sim({ screens: [screen], title: 'Demo' });
    sim.screens[0].createModel();
    sim.step(0.1);
    sim.step(0.1);
    expect(value.get()).toBe(2);
    expect(sim.clock.frame).toBe(2);
  });

  it('runs the animation on the scene', () => {
    const x = new Property(0);
    const node = new RectNode(0, 0, 10, 10);
    const animation = animateNumber(x, 10, { duration: 1 });
    const stop = x.link((value) => {
      node.translation = v2(value, 0);
    });
    animation.step(1);
    expect(node.translation.x).toBe(10);
    stop();
  });
});
