'use strict'

const { Schema, h } = require('koishi')
const { defaults, InputError, roll, choose } = require('./random')

exports.name = 'secure-dice'
exports.Config = Schema.object({
  command: Schema.string().pattern(/^[\p{L}\p{N}_-]+$/u).default('dice').description('主命令名，例如 dice 或 骰娘'),
  maxDice: Schema.number().min(1).max(100).step(1).default(defaults.maxDice).description('单次骰子总数上限'),
  maxSides: Schema.number().min(1).max(1_000_000).step(1).default(defaults.maxSides).description('自定义骰子面数上限'),
  maxInputLength: Schema.number().min(20).max(1000).step(1).default(defaults.maxInputLength).description('输入长度上限'),
})
exports.usage = '使用 dice [0,20]、dice 3d10+1、dice do & donot。区间包含两端；支持 D11 等自定义骰子。主命令可配置，按输入自动识别功能。'

exports.apply = (ctx, supplied = {}) => {
  const config = exports.Config(supplied)
  const logger = ctx.logger('secure-dice')
  const execute = (operation, text) => {
    try {
      // Return a text element so user options cannot inject mentions or media.
      return h.text(operation(text, config))
    } catch (error) {
      if (error instanceof InputError) return h.text(error.message)
      logger.error(error)
      return '随机数生成失败，请稍后重试。'
    }
  }
  ctx.command(`${config.command} [expression:text]`, '骰娘：区间随机数或骰子表达式')
    .example(`${config.command} [-100,100]`)
    .example(`${config.command} 3d10+1`)
    .action((_, expression) => execute(expression?.includes('&') ? choose : roll, expression))
}

