'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { App, h } = require('koishi')
const mock = require('@koishijs/plugin-mock').default
const plugin = require('../lib')

test('Koishi auto dispatch, errors, and text escaping', async () => {
  const app = new App({ prefix: '/', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin)
  await app.start()
  try {
    const client = app.mock.client('tester')
    await client.shouldReply('/dice [-100,-100]', '区间 [-100,-100] 的结果是 -100！')
    await client.shouldReply('/dice 3d1+1', '3d1[1, 1, 1] + 1 = 4')
    await client.shouldReply('/dice do it & do not', /^结果是 (do it|do not) !$/)
    await client.shouldReply('/dice 3d10+1 & 2d6+1d4-2', /^结果是 (3d10\+1|2d6\+1d4-2) !$/)
    await client.shouldReply('/dice `3d10+1`  & `2d6+1d4-2`', /^结果是 `(3d10\+1|2d6\+1d4-2)` !$/)
    await client.shouldReply('/dice D0 & D6', /^结果是 (D0|D6) !$/)
    await client.shouldReply('/dice a & b & c', '请用一个 & 分隔两个非空选项，例如 do & donot。')
    await client.shouldReply('/dice a &', '请用一个 & 分隔两个非空选项，例如 do & donot。')
    await client.shouldReply('/dice [20,0]', '区间下限不能大于上限。')
    await client.shouldReply('/dice', '请输入 [0,20] 或 3d10+1。')
    const original = client.bot.sendMessage
    let sent
    client.bot.sendMessage = function (channel, fragment, ...args) {
      sent = h.normalize(fragment)
      return original.call(this, channel, fragment, ...args)
    }
    const replies = await client.receive('/dice <at id="123"/> & <at id="123"/>')
    assert.equal(replies.length, 1)
    assert.ok(sent.every(element => element.type === 'text'))
  } finally { await botScope.dispose(); await app.stop() }
})

test('custom English command and limits', async () => {
  const app = new App({ prefix: '!', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin, { command: 'roll', maxDice: 2 })
  await app.start()
  try {
    const client = app.mock.client('tester')
    await client.shouldReply('!roll D1', '1d1[1] = 1')
    await client.shouldReply('!roll 好 & 好', '结果是 好 !')
    await client.shouldReply('!roll 3d6', '骰子数量必须在 1 到 2 之间。')
  } finally { await botScope.dispose(); await app.stop() }
})
