/**
 * Low-level entry point: the scene graph, observables, geometry, animation, and
 * the simulation loop.
 *
 * Importing `@medu/lerno/core` keeps the content schema, grading, and zod out of
 * the bundle — none of the layers below import them. Reach for this when a
 * surface only draws and animates; reach for the package root when it also
 * loads documents or grades answers.
 */
export * from './dot/index';
export * from './axon/index';
export * from './kite/index';
export * from './scenery/index';
export * from './twixt/index';
export * from './sim/index';
