'use strict'

const { Schema, h } = require('koishi')
const { defaults, InputError, FormatError, roll, choose } = require('./random')
const { help, formatHint } = require('./help')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')

exports.name = 'secure-dice'
exports.Config = Schema.object({
  maxDice: Schema.number().min(1).max(100).step(1).default(defaults.maxDice).description('单次骰子总数上限'),
  maxInputLength: Schema.number().min(20).max(1000).step(1).default(defaults.maxInputLength).description('输入长度上限'),
})
exports.usage = readFileSync(join(__dirname, '..', 'README.md'), 'utf8')

exports.apply = (ctx, supplied = {}) => {
  const config = { ...exports.Config(supplied), command: 'dice' }
  const logger = ctx.logger('secure-dice')
  const execute = (operation, text) => {
    try {
      // Return a text element so user options cannot inject mentions or media.
      return h.text(operation(text, config))
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
    .action((_, expression) => {
      // Some message paths retain an extra layer of entities after text-domain
      // decoding (e.g. &#x20;). Decode once only; always send through h.text().
      if (expression && expression.length > config.maxInputLength) {
        return h.text(`输入不能超过 ${config.maxInputLength} 个字符。`)
      }
      const text = h.unescape(expression || '').trim()
      if (!text || /^help$/i.test(text)) return h.text(help(config))
      return execute(text.includes('&') ? choose : roll, text)
    })
}

