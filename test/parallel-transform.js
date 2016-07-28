/* eslint-disable no-unused-expressions */
import test from 'ava';
import sinon from 'sinon';
import ParallelTransform from '../src/parallel-transform';
import {getParallelTransformStream} from './lib/helpers';

test.cb('should call a child\'s _parallelTransform function on write', t => { // eslint-disable-line max-len
  const transformStub = sinon.stub().callsArgWith(2),
    ParallelTransformStub = getParallelTransformStream(transformStub),
    transformInstance = new ParallelTransformStub(),
    data = 'some data';

  transformInstance.on('data', () => {});
  transformInstance.on('end', () => {
    t.true(transformStub.calledOnce);
    t.is(transformStub.args[0][0].toString(), data);
    t.end();
  });

  transformInstance.write(data);
  transformInstance.end();
});

test.cb('should emit the _parallelTransform function\'s data', t => {
  const result = 'some result',
    ParallelTransformStub = getParallelTransformStream(
      sinon.stub().callsArgWith(2, null, result)
    ),
    transformInstance = new ParallelTransformStub();

  transformInstance.on('data', data => {
    t.is(data.toString(), result);
  });
  transformInstance.on('end', t.end);

  transformInstance.write('some data');
  transformInstance.end();
});

test('should throw an error when not implementing _parallelTransform', t => {
  class BrokenParallelTransform extends ParallelTransform {}
  const transformInstance = new BrokenParallelTransform();

  t.throws(() => {
    transformInstance.write('some data');
  }, 'Not implemented');
});

test.cb('should pass options on to the stream.Transform constructor', t => {
  const transformStub = sinon.stub().callsArg(2),
    data = {someKey: 'someValue'},
    maxParallel = 1,
    options = {objectMode: true},
    ParallelTransformStub = getParallelTransformStream(
      transformStub,
      maxParallel,
      options
    ),
    transformInstance = new ParallelTransformStub();

  transformInstance.on('data', result => {
    t.deepEqual(result, data);
  });

  transformInstance.on('end', () => {
    t.true(transformStub.calledOnce);
    t.end();
  });

  transformInstance.write(data);
  transformInstance.end();
});

test('should allow instantiation via function call', t => {
  const stream = ParallelTransform.create(1, (data, encoding, done) => {
    done(null, data);
  });

  t.true(stream instanceof ParallelTransform);
});
