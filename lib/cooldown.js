'use strict'

const { performance } = require('node:perf_hooks')

// Per bot, platform, conversation and user. Monotonic time avoids clock jumps.
exports.createCooldown = (seconds, now = () => performance.now()) => {
  const expires = new Map()
  const duration = seconds * 1000
  let nextSweep = 0
  const keyOf = session => session?.userId && session?.platform && session?.selfId
    ? JSON.stringify([session.platform, session.selfId, !!session.isDirect, session.channelId || session.userId, session.userId])
    : null
  return {
    remaining(session) {
      if (!duration) return 0
      const time = now()
      if (time >= nextSweep) {
        for (const [key, expiry] of expires) if (expiry <= time) expires.delete(key)
        nextSweep = time + 60000
      }
      const key = keyOf(session)
      return key === null ? 0 : Math.max(0, Math.ceil(((expires.get(key) || 0) - time) / 1000))
    },
    start(session) {
      const key = keyOf(session)
      if (duration && key !== null) expires.set(key, now() + duration)
    },
  }
}
