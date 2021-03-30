export default class Bode {
  constructor (resolver) {
    if (typeof resolver !== 'function') {
      throw new TypeError('bad resolver')
    }
    let value
    let status = -1 // pending
    let callbacks = []
    const self = {}

    const makeCallbacks = () => {
      callbacks.map(callback => callback[status](value))
      callbacks = []
    }

    const rejectThis = r => {
      value = r
      status = 1 // rejected - also index into callback tuple
      makeCallbacks()
    }

    const resolveThis = v => {
      if (v === self) {
        return rejectThis(new TypeError('self-resolve'))
      }
      if (v && (typeof v === 'function' || typeof v === 'object')) {
        let then
        try {
          then = v.then
        } catch (err) {
          return rejectThis(err)
        }
        if (typeof then === 'function') {
          return runResolver(then.bind(v), resolveThis, rejectThis)
        }
      }
      value = v
      status = 0 // resolved - index into callback tuple
      makeCallbacks()
    }

    self.then = (onFulfilled, onRejected) =>
      new Bode((resolve, reject) => {
        callbacks.push([
          handler(onFulfilled, resolve, reject) || resolve,
          handler(onRejected, resolve, reject) || reject
        ])
        if (status >= 0) makeCallbacks()
      })
    runResolver(resolver, resolveThis, rejectThis)
    return self
  }
}

function runResolver (resolver, resolve, reject) {
  let n = 0
  const once = fn => v => n++ || fn(v)
  try {
    resolver(once(resolve), once(reject))
  } catch (err) {
    once(reject)(err)
  }
}

function handler (fn, resolve, reject) {
  if (typeof fn !== 'function') return
  return v =>
    asap(() => {
      try {
        resolve(fn(v))
      } catch (err) {
        reject(err)
      }
    })
}

const asap = ((q = []) => fn => {
  q.push(fn) === 1 &&
    (setImmediate || setTimeout)(() => {
      for (let f = q.shift(); f; f = q.shift()) f()
    })
})()
