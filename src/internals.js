const kStatus = Symbol('status')
const kValue = Symbol('value')
const kFNotify = Symbol('fNotify')
const kRNotify = Symbol('rNotify')
const PENDING = Symbol('pending')
const FULFILLED = Symbol('fulfilled')
const REJECTED = Symbol('rejected')

export function initialise (p) {
  p[kStatus] = PENDING
  p[kValue] = undefined
  p[kFNotify] = undefined
  p[kRNotify] = undefined
}

export function runResolver (resolver, p) {
  try {
    resolver(resolve, reject)
  } catch (err) {
    reject(err)
  }

  function resolve (v) {
    if (!p) return
    resolvePromise(p, v)
    p = undefined
  }

  function reject (r) {
    if (!p) return
    rejectPromise(p, r)
    p = undefined
  }
}

function rejectPromise (p, reason) {
  p[kStatus] = REJECTED
  p[kValue] = reason
  if (p[kRNotify]) p[kRNotify](reason)
  p[kFNotify] = p[kRNotify] = undefined
}

function resolvePromise (p, value) {
  if (p === value) {
    return rejectPromise(p, new TypeError('self-resolve'))
  }

  const vt = typeof value
  if (value && (vt === 'function' || vt === 'object')) {
    if (kStatus in value) return connectPromises(value, p)

    let then
    try {
      then = value.then
    } catch (err) {
      return rejectPromise(p, err)
    }
    if (typeof then === 'function') {
      return runResolver(then.bind(value), p)
    }
  }
  p[kStatus] = FULFILLED
  p[kValue] = value
  if (p[kFNotify]) p[kFNotify](value)
  p[kFNotify] = p[kRNotify] = undefined
}

export function connectPromises (parent, child, fHandler, rHandler) {
  fHandler = makeHandler(fHandler, child) || (v => resolvePromise(child, v))
  rHandler = makeHandler(rHandler, child) || (r => rejectPromise(child, r))
  if (parent[kStatus] === PENDING) {
    parent[kFNotify] = addHandler(parent[kFNotify], fHandler)
    parent[kRNotify] = addHandler(parent[kRNotify], rHandler)
  } else if (parent[kStatus] === FULFILLED) {
    fHandler(parent[kValue])
  } else {
    rHandler(parent[kValue])
  }
}

function makeHandler (fn, p) {
  if (typeof fn !== 'function') return
  return v =>
    asap(() => {
      try {
        resolvePromise(p, fn(v))
      } catch (err) {
        rejectPromise(p, err)
      }
    })
}

function addHandler (chain, fn) {
  if (!chain) return fn
  return v => {
    chain(v)
    fn(v)
  }
}

const queue = []
function asap (fn) {
  if (queue.push(fn) === 1) setImmediate(processAsapQueue)
}

function processAsapQueue () {
  while (queue.length) queue.shift()()
}
