import { initialise, connectPromises, runResolver } from './internals'

export default class Bode {
  constructor (resolver) {
    if (typeof resolver !== 'function') {
      throw new TypeError('bad resolver')
    }
    initialise(this)
    runResolver(resolver, this)
  }

  then (onFulfilled, onRejected) {
    const child = Object.create(Bode.prototype)
    initialise(child)
    connectPromises(this, child, onFulfilled, onRejected)
    return child
  }

  finally (handler) {
    return this.then(
      v => {
        handler()
        return v
      },
      r => {
        handler()
        throw r
      }
    )
  }

  static resolve (value) {
    const Factory = this
    return new Factory(resolve => resolve(value))
  }

  static reject (reason) {
    const Factory = this
    return new Factory((resolve, reject) => reject(reason))
  }

  static all (iterable) {
    const Factory = this
    const result = []
    return new Factory((resolve, reject) => {
      let n = 0
      for (const el of iterable) {
        resolveElement(el, n++)
      }
      if (!n) resolve(result)

      function resolveElement (el, idx) {
        Factory.resolve(el).then(value => {
          result[idx] = value
          if (!--n) resolve(result)
        }, reject)
      }
    })
  }

  static race (iterable) {
    const Factory = this
    return new Factory((resolve, reject) => {
      for (const el of iterable) {
        Factory.resolve(el).then(resolve, reject)
      }
    })
  }
}
