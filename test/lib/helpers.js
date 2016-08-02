import ParallelTransform from '../../src/parallel-transform';

/**
 * Returns a mock ParallelTransform stream
 * @param {Function} parallelTransform The transformation function
 * @param {Object}   options ParallelTransform options
 * @param {Function} parallelFlush The flush function
 * @return {Stream} A ParallelTransform stream
 **/
export function getParallelTransformStream(
  parallelTransform = (data, done) => {
    done(null, data);
  },
  options = {maxParallel: 1},
  parallelFlush = done => done()
) {
  class TransformTestClass extends ParallelTransform {
    constructor() {
      super(options);
    }
  }

  TransformTestClass.prototype // eslint-disable-line no-underscore-dangle
    ._parallelTransform = parallelTransform;

  TransformTestClass.prototype // eslint-disable-line no-underscore-dangle
    ._parallelFlush = parallelFlush;

  return TransformTestClass;
}
