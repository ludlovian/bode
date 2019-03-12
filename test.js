'use strict'

const promisesAplusTests = require("promises-aplus-tests")
const P = require('./src').default
const adapter = {
  deferred () {
    const defer = {}
    defer.promise = new P((resolve, reject) => {
      defer.resolve = resolve
      defer.reject = reject
    })
    return defer
  },

  resolved: x => new P(resolve => resolve(x)),
  rejected: x => new P((resolve, reject) => reject(x))
  }

promisesAplusTests(adapter, { timeout: 200, slow: Infinity, bail: true })
