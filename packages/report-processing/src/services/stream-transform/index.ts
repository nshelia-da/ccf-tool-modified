/*
this file is a copy of https://csv.js.org/transform/
the reason it exists, this issues:
 - https://github.com/adaltas/node-csv/issues/361
 - https://github.com/adaltas/node-csv/issues/153
you can remove it as soon as they will be fixed
The package name and version is: stream-transform@npm:3.2.1
*/
/*
Stream Transform

Please look at the [project documentation](https://csv.js.org/transform/) for
additional information.
*/

import stream from 'stream'
import util from 'util'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
const Transformer = function (options = {}, handler) {
  this.options = options
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  if (options.consume === undefined || options.consume === null) {
    this.options.consume = false
  }
  this.options.objectMode = true
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  if (options.parallel === undefined || options.parallel === null) {
    this.options.parallel = 100
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  if (options.params === undefined || options.params === null) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    options.params = null
  }
  this.handler = handler
  stream.Transform.call(this, this.options)
  this.state = {
    running: 0,
    started: 0,
    finished: 0,
    backPressure: false,
  }
  return this
}

util.inherits(Transformer, stream.Transform)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
Transformer.prototype._transform = function (chunk, encoding, cb) {
  this.state.started++
  this.state.running++
  if (this.state.running < this.options.parallel && !this.state.backPressure) {
    cb()
    cb = null // Cancel further callback execution
  }
  try {
    let l = this.handler.length
    if (this.options.params !== null) {
      l--
    }
    if (l === 1) {
      // sync
      this.__done(
        null,
        [this.handler.call(this, chunk, this.options.params)],
        cb,
      )
    } else if (l === 2) {
      // async
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      const callback = (err, ...chunks) => this.__done(err, chunks, cb)
      this.handler.call(this, chunk, callback, this.options.params)
    } else {
      throw Error('Invalid handler arguments')
    }
    return false
  } catch (err) {
    this.__done(err)
  }
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
Transformer.prototype._flush = function (cb) {
  if (this.state.running === 0) {
    cb()
  } else {
    this._ending = function () {
      cb()
    }
  }
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
Transformer.prototype.__done = function (err, chunks, cb) {
  this.state.running--
  if (err) {
    return this.emit('error', err)
  }
  this.state.finished++
  for (let chunk of chunks) {
    if (typeof chunk === 'number') {
      chunk = `${chunk}`
    }
    // We dont push empty string
    // See https://nodejs.org/api/stream.html#stream_readable_push
    if (chunk !== undefined && chunk !== null && chunk !== '') {
      this.state.backPressure = !this.push(chunk)
    }
  }
  if (cb) {
    cb()
  }
  if (this._ending && this.state.running === 0) {
    this._ending()
  }
}
const transform: any = function () {
  let options = {}
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  let callback, handler, records
  for (let i = 0; i < arguments.length; i++) {
    // eslint-disable-next-line prefer-rest-params
    const argument = arguments[i]
    let type = typeof argument
    if (argument === null) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      type = 'null'
    } else if (type === 'object' && Array.isArray(argument)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      type = 'array'
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    if (type === 'array') {
      records = argument
    } else if (type === 'object') {
      options = { ...argument }
    } else if (type === 'function') {
      if (handler && i === arguments.length - 1) {
        callback = argument
      } else {
        handler = argument
      }
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
    } else if (type !== 'null') {
      throw new Error(
        `Invalid Arguments: got ${JSON.stringify(argument)} at position ${i}`,
      )
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  const transformer = new Transformer(options, handler)
  let error = false
  if (records) {
    const writer = function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      for (const record of records) {
        if (error) break
        transformer.write(record)
      }
      transformer.end()
    }
    // Support Deno, Rollup doesnt provide a shim for setImmediate
    if (typeof setImmediate === 'function') {
      setImmediate(writer)
    } else {
      setTimeout(writer, 0)
    }
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  /* @ts-ignore */
  if (callback || options.consume) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    const result = []
    transformer.on('readable', function () {
      let record
      while ((record = transformer.read()) !== null) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        /* @ts-ignore */
        if (callback) {
          result.push(record)
        }
      }
    })
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    /* @ts-ignore */
    transformer.on('error', function (err) {
      error = true
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      if (callback) callback(err)
    })
    transformer.on('end', function () {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      /* @ts-ignore */
      if (callback && !error) callback(null, result)
    })
  }
  return transformer
}

// export default transform
export { transform, Transformer }
