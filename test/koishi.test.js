'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { App, h } = require('koishi')
const mock = require('@koishijs/plugin-mock').default
const plugin = require('../lib')
const { help } = require('../lib/help')

test('Koishi auto dispatch, errors, and text escaping', async () => {
  const app = new App({ prefix: '/', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin)
  await app.start()
  try {
    const client = app.mock.client('tester')
    const usage = help(plugin.Config({}))
    await client.shouldReply('/dice [-100,-100]', '区间 [-100,-100] 的结果是 -100！')
    await client.shouldReply('/dice 3d1+1', '3d1[1, 1, 1] + 1 = 4')
    await client.shouldReply('/dice do it & do not', /^结果是 (do it|do not) !$/)
    await client.shouldReply('/dice 3d10+1 & 2d6+1d4-2', /^结果是 (3d10\+1|2d6\+1d4-2) !$/)
    await client.shouldReply('/dice `3d10+1`  & `2d6+1d4-2`', /^结果是 `(3d10\+1|2d6\+1d4-2)` !$/)
    await client.shouldReply('/dice D0 & D6', /^结果是 (D0|D6) !$/)
    await client.shouldReply('/dice a & b & c', `二选一格式错误：需要且只能有一个半角 &，左右选项均不能为空。\n\n${usage}`)
    await client.shouldReply('/dice a &', `二选一格式错误：需要且只能有一个半角 &，左右选项均不能为空。\n\n${usage}`)
    await client.shouldReply('/dice [20,0]', `区间下限不能大于上限。\n\n${usage}`)
    await client.shouldReply('/dice', usage)
    await client.shouldReply('/dice help', usage)
    await client.shouldReply('/dice HELP', usage)
    await client.shouldReply('/dice help & help', '结果是 help !')
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
    const usage = help(plugin.Config({ command: 'roll', maxDice: 2 }))
    await client.shouldReply('!roll 3d6', `骰子数量必须在 1 到 2 之间。\n\n${usage}`)
    await client.shouldReply('!roll help', usage)
  } finally { await botScope.dispose(); await app.stop() }
})

test('quoted replies and serialized entity text from adapters', async () => {
  const app = new App({ prefix: '/', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin)
  await app.start()
  try {
    const client = app.mock.client('tester')
    const expected = /^结果是 (吃火鸡面|吃饺子) !$/
    await client.shouldReply(h.text('/dice 吃火鸡面 & 吃饺子').toString(), expected)
    await client.shouldReply('<quote id="123"/>' + h.text('/dice 吃火鸡面 & 吃饺子').toString(), expected)
    await client.shouldReply(h.text('/dice 吃火鸡面 & 吃饺子&#x20;').toString(), expected)
    await client.shouldReply(h.text('/dice 吃火鸡面 &amp; 吃饺子').toString(), expected)
    await client.shouldReply(h.text('/dice &#x20;').toString(), help(plugin.Config({})))
    await client.shouldReply(h.text('/dice D6 &amp; D20 &amp; D100').toString(), /^二选一格式错误：[\s\S]*使用方法/)
    const original = client.bot.sendMessage
    let sent
    client.bot.sendMessage = function (channel, fragment, ...args) {
      sent = h.normalize(fragment)
      return original.call(this, channel, fragment, ...args)
    }
    await client.receive(h.text('/dice &lt;at id="123"/&gt; & &lt;at id="123"/&gt;').toString())
    assert.ok(sent.every(element => element.type === 'text'))
  } finally { await botScope.dispose(); await app.stop() }
})
