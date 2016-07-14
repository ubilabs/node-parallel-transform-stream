/* eslint-disable no-underscore-dangle */
import stream from 'stream';
import cyclist from 'cyclist';

export default class ParallelTransform extends stream.Transform {
  /**
   * ParallelTransform instance
   * All child classes must implement the `_parallelTransform` function.
   * Child class should not implement the `_transform` and `_flush` functions.
   *
   * @param {Number} maxParallel The maximum number of
   *                             simulatenous transformations
   * @param {Object} options Options which will be passed
   *                         to the `stream.Transform` constructor
   **/
  constructor(maxParallel = 1, options = {}) {
    const defaultOptions = {
      highWaterMark: Math.max(maxParallel, 16)
    };

    super(Object.assign({}, defaultOptions, options));

    // set default properties
    this._maxParallel = maxParallel;
    this._destroyed = false;
    this._flushed = false;
    this._buffer = cyclist(maxParallel);
    this._top = 0;
    this._bottom = 0;
    this._ondrain = null;
  }

  static transform(maxParallel = 1, options = {}, transformFunction = null) {
    // options parameter can optionally be left out
    if (typeof options === 'function') {
      transformFunction = options;
      options = {};
    }

    class Transform extends ParallelTransform {
      constructor() {
        super(maxParallel, options);
      }

      _parallelTransform = transformFunction;
    }

    return new Transform();
  }

  /**
   * Destroys the stream
   * The results of all pending transformations will be discarded
   **/
  destroy() {
    if (this._destroyed) {
      return;
    }

    this._destroyed = true;
    this.emit('close');
  }

  /**
   * Parallises calls to this._transformFunction
   * @param {?} chunk The chunk of data to be transformed
   * @param {String} encoding Encoding, if it `chunk` is a string
   * @param {Function} done Callback to be called when finished
   **/
  _transform(chunk, encoding, done) {
    const pos = this._top++;

    this._parallelTransform(chunk, encoding, (err, data) => {
      if (this._destroyed) {
        return;
      }

      // abort on error
      if (err) {
        this.emit('error', err);
        this.push(null);
        this.destroy();
        return;
      }

      // insert result into corresponding place in buffer
      const result = typeof data === 'undefined' || data === null ? null : data;
      this._buffer.put(pos, result);

      // attempt to drain the buffer
      this._drain();
    });

    // immediatelly signal `done` if no more than `maxParallel` results buffered
    if (this._top - this._bottom < this._maxParallel) {
      done();
      return;
    }

    // otherwise wait until a transformation finished
    this._ondrain = done;
  }

  /**
   * Called when all items have been processed
   * @param {Function} done Callback to signify when done
   **/
  _flush(done) {
    this._flushed = true;
    this._ondrain = () => {
      this._parallelFlush(done);
    };
    this._drain();
  }

  /**
   * Fire the `data` event for buffered items, in order
   * The buffer will be cleared in such a way that the
   * order of the input items is preserved. This means that calling
   * `drain` does not necessarily clear the entire buffer, as it will
   * have to wait for further results if a transformation has not yet finished
   * This function should never be called from outside this class
   **/
  _drain() {
    // clear the buffer until we reach an item who's result has not yet arrived
    while (typeof this._buffer.get(this._bottom) !== 'undefined') {
      const data = this._buffer.del(this._bottom++);

      if (data === null) {
        continue;
      }

      this.push(data);
    }

    // call `ondrain` if the buffer is drained
    if (this._drained() && this._ondrain) {
      const ondrain = this._ondrain;
      this._ondrain = null;
      ondrain();
    }
  }

  /**
   * Checks whether or not the buffer is drained
   * While receiving chunks, the buffer counts as drained as soon as
   * no more than `maxParallel` items are buffered.
   * When the stream is being flushed, the buffer counts as drained
   * if and only if it is entirely empty.
   * @return {Boolean} true if drained
   **/
  _drained() {
    var diff = this._top - this._bottom;
    return this._flushed ? !diff : diff < this._maxParallel;
  }

  /**
   * The _transform function of the ParallelTransform stream
   * This function must be overriden by child classes
   * @param {?} data Data to be transformed
   * @param {String} encoding Encoding, if it `chunk` is a string
   * @param {Function} done Callback which must be executed
   *                        when transformations have finished
   **/
  _parallelTransform(data, encoding, done) { // eslint-disable-line no-unused-vars, max-len
    throw new Error('Not implemented');
  }

  /**
   * The _flush function of the ParallelTransform stream
   * This function may optionally be overriden by child classes
   * @param {Function} done Callback which must be executed
   *                        when finished
   **/
  _parallelFlush(done) {
    done();
  }
}
