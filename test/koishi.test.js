'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { App, h } = require('koishi')
const mock = require('@koishijs/plugin-mock').default
const plugin = require('../lib')
const { help } = require('../lib/help')

test('successful operations share cooldown; help and failed input do not consume it', async () => {
  const app = new App({ prefix: '/', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin, { cooldownSeconds: 10 })
  await app.start()
  try {
    const alice = app.mock.client('alice')
    const bob = app.mock.client('bob')
    await alice.shouldReply('/dice D11', '不支持该骰子面数。支持的面数：D4、D6、D8、D10、D12、D20、D100。')
    await alice.shouldReply('/dice a & & b & c', '格式错误。正确格式为 dice 选项一 & 选项二 & …')
    await alice.shouldReply('/dice help', help(plugin.Config({ cooldownSeconds: 10 })))
    await alice.shouldReply('/dice [5,5]', '区间 [5,5] 的结果是 5！')
    await alice.shouldReply('/dice D6', /^冷却中，请在 \d+ 秒后再试。$/)
    await alice.shouldReply('/dice a & b & c & d', /^冷却中，请在 \d+ 秒后再试。$/)
    await alice.shouldReply('/dice help', help(plugin.Config({ cooldownSeconds: 10 })))
    await bob.shouldReply('/dice a & & b & c', '格式错误。正确格式为 dice 选项一 & 选项二 & …')
    await bob.shouldReply('/dice a&b&c&d', /^结果是 (a|b|c|d) !$/)
    await bob.shouldReply('/dice [5,5]', /^冷却中，请在 \d+ 秒后再试。$/)
    await bob.shouldReply('/dice D6', /^冷却中，请在 \d+ 秒后再试。$/)
    await bob.shouldReply('/dice a & b', /^冷却中，请在 \d+ 秒后再试。$/)
    await bob.shouldReply('/dice help', help(plugin.Config({ cooldownSeconds: 10 })))
  } finally { await botScope.dispose(); await app.stop() }
})

test('Koishi auto dispatch, errors, and text escaping', async () => {
  const app = new App({ prefix: '/', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin)
  await app.start()
  try {
    const client = app.mock.client('tester')
    const usage = help(plugin.Config({}))
    await client.shouldReply('/dice [-100,-100]', '区间 [-100,-100] 的结果是 -100！')
    await client.shouldReply('/dice D4', /^1d4\[[1-4]\] = [1-4]$/)
    await client.shouldReply('/dice do it & do not', /^结果是 (do it|do not) !$/)
    await client.shouldReply('/dice 3d10+1 & 2d6+1d4-2', /^结果是 (3d10\+1|2d6\+1d4-2) !$/)
    await client.shouldReply('/dice `3d10+1`  & `2d6+1d4-2`', /^结果是 `(3d10\+1|2d6\+1d4-2)` !$/)
    await client.shouldReply('/dice D0 & D6', /^结果是 (D0|D6) !$/)
    await client.shouldReply('/dice a & b & c', /^结果是 (a|b|c) !$/)
    await client.shouldReply('/dice 选项一&选项二&选项三&选项四', /^结果是 选项[一二三四] !$/)
    await client.shouldReply('/dice 选项一 & 选项二 & 选项三 & 选项四', /^结果是 选项[一二三四] !$/)
    await client.shouldReply('/dice `3d10+1` & `2d6+1d4-2` & D0 & [20,0]', /^结果是 (`3d10\+1`|`2d6\+1d4-2`|D0|\[20,0\]) !$/)
    for (const expression of ['a &', 'a && b & c', '& a & b & c', 'a & b & c &']) {
      await client.shouldReply('/dice ' + expression, '格式错误。正确格式为 dice 选项一 & 选项二 & …')
    }
    await client.shouldReply('/dice [20,0]', '区间下限不能大于上限。')
    await client.shouldReply('/dice', usage)
    await client.shouldReply('/dice help', usage)
    await client.shouldReply('/dice HELP', usage)
    await client.shouldReply('/dice help & help', '结果是 help !')
    await client.shouldReply('/dice [0 20]', '格式错误。正确格式为 dice [下限,上限]')
    await client.shouldReply('/dice 3d6++1', '格式错误。正确格式为 dice 数量d面数±修正值')
    await client.shouldReply('/dice hello', '格式错误。正确格式为：\ndice [下限,上限]\ndice 数量d面数±修正值\ndice 选项一 & 选项二 & …')
    await client.shouldReply('/dice D11', '不支持该骰子面数。支持的面数：D4、D6、D8、D10、D12、D20、D100。')
    await client.shouldReply('/dice ' + 'x'.repeat(501), '输入不能超过 500 个字符。')
    await client.shouldReply('/dice a&b&c&' + 'x'.repeat(495), '输入不能超过 500 个字符。')
    const original = client.bot.sendMessage
    let sent
    client.bot.sendMessage = function (channel, fragment, ...args) {
      sent = h.normalize(fragment)
      return original.call(this, channel, fragment, ...args)
    }
    const replies = await client.receive('/dice ' + Array(4).fill('<at id="123"/>').join(' & '))
    assert.equal(replies.length, 1)
    assert.ok(sent.every(element => element.type === 'text'))
    assert.ok(sent.map(element => element.toString()).join('').includes('&lt;at'))
  } finally { await botScope.dispose(); await app.stop() }
})

test('native command alias and limits', async () => {
  const app = new App({ prefix: '!', delay: { character: 0, message: 0 } })
  const botScope = app.plugin(mock)
  app.plugin(plugin, { maxDice: 2 })
  app.command('dice').alias('roll')
  await app.start()
  try {
    const client = app.mock.client('tester')
    await client.shouldReply('!dice D4', /^1d4\[[1-4]\] = [1-4]$/)
    await client.shouldReply('!dice 好 & 好', '结果是 好 !')
    await client.shouldReply('!roll [5,5]', '区间 [5,5] 的结果是 5！')
    const usage = help(plugin.Config({ maxDice: 2 }))
    await client.shouldReply('!dice 3d6', '骰子数量必须在 1 到 2 之间。')
    await client.shouldReply('!dice help', usage)
    await client.shouldReply('!dice 3d6++', '骰子数量必须在 1 到 2 之间。')
    await client.shouldReply('!dice D6+', '格式错误。正确格式为 dice 数量d面数±修正值')
    await client.shouldReply('!dice [0,', '格式错误。正确格式为 dice [下限,上限]')
    await client.shouldReply('!dice a &', '格式错误。正确格式为 dice 选项一 & 选项二 & …')
    assert.ok(!usage.includes('D11') && !usage.includes('maxSides'))
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
    await client.shouldReply(h.text('/dice D6 &amp; D20 &amp; D100').toString(), /^结果是 (D6|D20|D100) !$/)
    const multiChoice = /^结果是 (吃火鸡面|吃饺子|吃面条|吃米饭) !$/
    await client.shouldReply(h.text('/dice 吃火鸡面&吃饺子&吃面条&吃米饭').toString(), multiChoice)
    await client.shouldReply(h.text('/dice 吃火鸡面 &amp; 吃饺子 &amp; 吃面条 &amp; 吃米饭').toString(), multiChoice)
    await client.shouldReply('<quote id="123"/>' + h.text('/dice 吃火鸡面 & 吃饺子 & 吃面条 & 吃米饭&#x20;').toString(), multiChoice)
    await client.shouldReply(h.text('/dice a &amp; &amp; b &amp; c').toString(), '格式错误。正确格式为 dice 选项一 & 选项二 & …')
    const original = client.bot.sendMessage
    let sent
    client.bot.sendMessage = function (channel, fragment, ...args) {
      sent = h.normalize(fragment)
      return original.call(this, channel, fragment, ...args)
    }
    const replies = await client.receive(h.text('/dice ' + Array(4).fill('&lt;at id="123"/&gt;').join(' & ')).toString())
    assert.equal(replies.length, 1)
    assert.ok(sent.every(element => element.type === 'text'))
    assert.ok(sent.map(element => element.toString()).join('').includes('&lt;at'))
  } finally { await botScope.dispose(); await app.stop() }
})
