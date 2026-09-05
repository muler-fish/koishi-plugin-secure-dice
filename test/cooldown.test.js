'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { createCooldown } = require('../lib/cooldown')
const user = { platform: 'mock', selfId: 'bot', channelId: 'group', userId: 'alice', isDirect: false }

test('cooldown expires exactly and isolates users, channels, bots and platforms', () => {
  let time = 0
  const cd = createCooldown(5, () => time)
  assert.equal(cd.remaining(user), 0)
  cd.start(user)
  assert.equal(cd.remaining(user), 5)
  for (const change of [{ userId: 'bob' }, { channelId: 'other' }, { selfId: 'other' }, { platform: 'other' }, { isDirect: true }]) {
    assert.equal(cd.remaining({ ...user, ...change }), 0)
  }
  time = 4001
  assert.equal(cd.remaining(user), 1)
  time = 5000
  assert.equal(cd.remaining(user), 0)
  cd.start(user)
  time = 10000
  assert.equal(cd.remaining(user), 0)
  time = 60001
  assert.equal(cd.remaining(user), 0)
})

test('disabled cooldown and incomplete sessions do not create shared buckets', () => {
  const cd = createCooldown(0, () => 0)
  cd.start(user)
  assert.equal(cd.remaining(user), 0)
  const enabled = createCooldown(5, () => 0)
  for (const session of [undefined, {}, { userId: 'alice' }]) {
    enabled.start(session)
    assert.equal(enabled.remaining(session), 0)
  }
})
