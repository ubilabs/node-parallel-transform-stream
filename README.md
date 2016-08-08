# Parallel Transform Stream

A NodeJS transform stream which runs transformations in parallel and preserves input order.

```sh
npm install parallel-transform-stream --save
```

## Usage

This module is (almost) a drop-in replacement for standard NodeJS transform streams.

```js
import ParallelTransform from 'parallel-transform-stream';

class MyParallelTransformStream extends ParallelTransform {
	constructor() {
		super({maxParallel: 50, objectMode: true}); // process up to 50 transforms in parallel
	}

	_parallelTransform(data, encoding, done) {
		// long-running, asynchronous operation
		done(null, data);
	}

	// optional, like in stream.Transform
	_parallelFlush(done) {
		// finish stuff, if required
		done();
	}
}
```

Alternatively, you can use the following shortcut function:

```js
import ParallelTransform from 'parallel-transform-stream';

const MyParallelTransformStream = ParallelTransform.create((data, encoding, done) => {
	// long-running, asynchronous operation
	done(null, data);
});
```

## Documentation

All classes extending the `ParallelTransform` class must implement the method `_parallelTransform`.  
They may implement `_parallelFlush`, although this is not required.

### API

**ParallelTransform.create(transform, flush = function(done) { done(); }, defaultOptions = {})**

* `transform` `<Function>` The \_transform function of the stream. [See below](#api-for-extending-paralleltransform) for more details
* `flush` `<Function>` The \_flush function of the stream. [See below](#api-for-extending-paralleltransform) for more details
* `defaultOptions` `<Object>` Default options for the class constructor

### API for extending ParallelTransform

The constructor of the `ParallelTransform` class accepts all options accepted by `stream.Transform`. In addition, it accepts the `maxParallel` property, which set the maximum number of parallel transformations.

All classes extending `ParallelTransform` must implement the `_parallelTransform` method, and may implement the `_parallelFlush` method.

**ParallelTransform._parallelTransform(chunk, encoding, callback)**

* `chunk` `<Buffer>` | `<String>` The chunk to be transformed.
* `encoding` `<String>` If the chunk is a string, then this is the encoding type. If chunk is a buffer, then this is the special value - 'buffer', ignore it in this case.
* `callback` `<Function>` A callback function to be called after the supplied chunk has been processed. The first argument passed to the callback must be an error which has occurred during transformation, or `null`. The second argument is the result. The stream will stop processing transforms and emit an `error` event instantly if the error passed to the callback function was not `null`.

*Please note* that, as opposed to traditional NodeJS transform streams, you **MUST NOT** call `this.push` directly. Emit values through the callback function instead.  
You **must not** call the callback more than once.

**ParallelTransform._parallelFlush(callback)**

* `callback` `<Function>` A callback function to be called when the stream has finished flushing.

`ParallelTransform` implementations may implement the transform._flush() method. This will be called when there is no more written data to be consumed, but before the 'end' event is emitted signaling the end of the Readable stream.

### Migrating from stream.Transform

1. Change `extends stream.Transform` to `extends ParallelTransform`
2. Rename `_transform(data, encoding, done)` to `_parallelTransform(data, encoding, done)`
3. If using `_flush`: Rename `_flush(done)` to `_parallelFlush(done)`
4. Replace `this.push(data); done();` with `done(null, data);`

#### Example

```js
import stream from 'stream';

class MyTransformStream extends stream.Transform {
	constructor() {
		super({objectMode: true});
	}

	_transform(data, encoding, done) {
		// do something with `data`
		this.push(data);
		done();
	}
}
```

becomes

```js
import ParallelTransform from 'parallel-transform-stream';

class MyTransformStream extends ParallelTransform {
	constructor() {
		super({objectMode: true});
	}

	_parallelTransform(data, encoding, done) {
		// do something with `data`
		done(null, data);
	}
}
```

### Gotchas and caveats

* Calling `this.push()` will result in unexpected behaviour. Push results by calling `done(null, result)`.
* Calling `done()` more than once will result in unexpected behaviour
* By design, you cannot push multiple results from a single transform
