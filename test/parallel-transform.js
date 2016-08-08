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
  }, '_parallelTransform not implemented');
});

test.cb('should pass options on to the stream.Transform constructor', t => {
  const transformStub = sinon.stub().callsArg(2),
    data = {someKey: 'someValue'},
    options = {
      maxParallel: 1,
      objectMode: true
    },
    ParallelTransformStub = getParallelTransformStream(
      transformStub,
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
  const ParallelStream = ParallelTransform.create({
    maxParallel: 1
  },
  (data, encoding, done) => {
    done(null, data);
  });

  t.true(new ParallelStream() instanceof ParallelTransform);
});

test.cb('should run `maxParallel` transforms in parallel', t => {
  const dones = [],
    TransformStub = ParallelTransform.create((data, encoding, done) => {
      dones.push(done);
    }),
    transformInstance = new TransformStub({maxParallel: 3});

  transformInstance.on('data', () => {});
  transformInstance.on('end', t.end);

  transformInstance.write('some data');
  transformInstance.write('some data');
  transformInstance.write('some data');
  transformInstance.write('some data');

  t.is(dones.length, 3);
  dones.forEach(done => done(null, 'result'));
  dones[dones.length - 1](null, 'result');

  transformInstance.end();
});

test.cb('should emit results in input order', t => {
  const dones = [],
    TransformStub = ParallelTransform.create((data, encoding, done) => {
      dones.push({done, data});
    }),
    transformInstance = new TransformStub({maxParallel: 3});

  let ctr = 0;
  transformInstance.on('data', result => {
    t.is(result.toString(), String(ctr++));
  });
  transformInstance.on('end', t.end);

  transformInstance.write('0');
  transformInstance.write('1');
  transformInstance.write('2');
  transformInstance.write('3');
  transformInstance.end();

  dones[1].done(null, dones[1].data);
  dones[2].done(null, dones[2].data);
  dones[0].done(null, dones[0].data);
  dones[3].done(null, dones[3].data);
});

test.cb('should call _parallelFlush when the stream is flushing', t => {
  const flush = sinon.stub().callsArg(0),
    ParallelTransformStub = getParallelTransformStream(
      sinon.stub().callsArgWith(2, null, 'some result'),
      {maxParallel: 1},
      flush
    ),
    transformInstance = new ParallelTransformStub();

  transformInstance.on('data', () => {});
  transformInstance.on('end', t.end);

  transformInstance.write('some data');
  transformInstance.end();

  t.true(flush.calledOnce);
});
