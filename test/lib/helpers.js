import ParallelTransform from '../../src/parallel-transform';

/**
 * Returns a mock ParallelTransform stream
 * @param {Function} parallelTransform The transformation function
 * @param {Number}   maxParallel The maximum number of
                                 parallel transformations
 * @param {Object}   options ParallelTransform options
 * @return {Stream} A ParallelTransform stream
 **/
export function getParallelTransformStream(
  parallelTransform = (data, done) => {
    done(null, data);
  },
  maxParallel = 1,
  options = {}
) {
  class TransformTestClass extends ParallelTransform {
    constructor() {
      super(maxParallel, options);
    }
  }

  TransformTestClass.prototype // eslint-disable-line no-underscore-dangle
    ._parallelTransform = parallelTransform;

  return TransformTestClass;
}
