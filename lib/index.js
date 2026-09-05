'use strict'

const { Schema, h } = require('koishi')
const { defaults, InputError, FormatError, roll, choose } = require('./random')
const { help, usage, formatHint } = require('./help')
const { createCooldown } = require('./cooldown')

exports.name = 'secure-dice'
exports.Config = Schema.object({
  maxDice: Schema.number().min(1).max(100).step(1).default(defaults.maxDice).description('单次骰子总数上限'),
  maxInputLength: Schema.number().min(20).max(1000).step(1).default(defaults.maxInputLength).description('输入长度上限'),
  cooldownSeconds: Schema.number().min(0).max(3600).step(1).default(0).description('使用冷却时间（秒）。同一用户在同一会话内共用冷却，0 表示关闭。'),
})
exports.usage = usage

exports.apply = (ctx, supplied = {}) => {
  const config = { ...exports.Config(supplied), command: 'dice' }
  const logger = ctx.logger('secure-dice')
  const cooldown = createCooldown(config.cooldownSeconds)
  const execute = (operation, text, session) => {
    try {
      // Return a text element so user options cannot inject mentions or media.
      const result = h.text(operation(text, config))
      cooldown.start(session)
      return result
    } catch (error) {
      if (error instanceof FormatError) return h.text(formatHint(config.command, error.kind))
      if (error instanceof InputError) return h.text(error.message)
      logger.error(error)
      return '随机数生成失败，请稍后重试。'
    }
  }
  ctx.command(`${config.command} [expression:text]`, '骰娘：随机整数、投骰与自由二选一')
    .usage(help(config))
    .example(`${config.command} [-100,100]`)
    .example(`${config.command} 3d10+1`)
    .action(({ session }, expression) => {
      // Some message paths retain an extra layer of entities after text-domain
      // decoding (e.g. &#x20;). Decode once only; always send through h.text().
      if (expression && expression.length > config.maxInputLength) {
        return h.text(`输入不能超过 ${config.maxInputLength} 个字符。`)
      }
      const text = h.unescape(expression || '').trim()
      if (!text || /^help$/i.test(text)) return h.text(help(config))
      const remaining = cooldown.remaining(session)
      if (remaining) return h.text(`冷却中，请在 ${remaining} 秒后再试。`)
      return execute(text.includes('&') ? choose : roll, text, session)
    })
}

