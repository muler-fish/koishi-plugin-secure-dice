'use strict'

const { randomInt } = require('node:crypto')
const LIMIT = 1_000_000_000
const defaults = Object.freeze({ maxDice: 100, maxSides: 1_000_000, maxInputLength: 500 })

class InputError extends Error {}

function input(text, options) {
  if (typeof text !== 'string' || !text.trim()) throw new InputError('请输入 [0,20] 或 3d10+1。')
  if (text.length > options.maxInputLength) throw new InputError(`输入不能超过 ${options.maxInputLength} 个字符。`)
  return text.trim()
}

// Node crypto.randomInt uses an exclusive upper bound and avoids modulo bias.
function inclusive(min, max, rng = randomInt) {
  return rng(min, max + 1)
}

function roll(text, config = {}, rng = randomInt) {
  const options = { ...defaults, ...config }
  const source = input(text, options)
  const range = /^\[\s*([+-]?\d+)\s*[,，]\s*([+-]?\d+)\s*\]$/.exec(source)
  if (range) {
    const min = Number(range[1]), max = Number(range[2])
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || Math.abs(min) > LIMIT || Math.abs(max) > LIMIT) {
      throw new InputError(`区间端点必须是 -${LIMIT} 到 ${LIMIT} 内的整数。`)
    }
    if (min > max) throw new InputError('区间下限不能大于上限。')
    return `区间 [${min},${max}] 的结果是 ${inclusive(min, max, rng)}！`
  }

  // Parse the entire expression before drawing. Never execute user input.
  const pattern = /\s*([+-]?)\s*(?:(\d*)[dD](\d+)|(\d+))\s*/y
  const terms = []
  let position = 0, diceCount = 0
  while (position < source.length) {
    pattern.lastIndex = position
    const match = pattern.exec(source)
    if (!match || (terms.length && !match[1])) throw new InputError('格式错误。支持 [下限,上限]、D20、3d10+1、2d6+1d4-2。')
    const sign = match[1] === '-' ? -1 : 1
    if (match[3] !== undefined) {
      const count = match[2] === '' ? 1 : Number(match[2])
      const sides = Number(match[3])
      if (!Number.isSafeInteger(count) || count < 1 || count > options.maxDice) throw new InputError(`骰子数量必须在 1 到 ${options.maxDice} 之间。`)
      if (!Number.isSafeInteger(sides) || sides < 1 || sides > options.maxSides) throw new InputError(`骰子面数必须在 1 到 ${options.maxSides} 之间。`)
      diceCount += count
      if (diceCount > options.maxDice) throw new InputError(`一次最多投 ${options.maxDice} 颗骰子。`)
      terms.push({ sign, count, sides })
    } else {
      const value = Number(match[4])
      if (!Number.isSafeInteger(value) || value > LIMIT) throw new InputError(`修正值不能超过 ${LIMIT}。`)
      terms.push({ sign, value })
    }
    position = pattern.lastIndex
  }
  if (!diceCount) throw new InputError('表达式中至少需要一颗骰子，例如 D6 或 3d10+1。')
  let total = 0
  const detail = terms.map((term, index) => {
    const prefix = term.sign < 0 ? (index ? ' - ' : '-') : (index ? ' + ' : '')
    if (!term.count) {
      total += term.sign * term.value
      return prefix + term.value
    }
    const values = Array.from({ length: term.count }, () => inclusive(1, term.sides, rng))
    total += term.sign * values.reduce((a, b) => a + b, 0)
    return `${prefix}${term.count}d${term.sides}[${values.join(', ')}]`
  }).join('')
  return `${detail} = ${total}`
}

function choose(text, config = {}, rng = randomInt) {
  const options = { ...defaults, ...config }
  if (!text || !text.trim()) throw new InputError('请输入两个选项，例如 do & donot。')
  const parts = input(text, options).split('&').map(part => part.trim())
  if (parts.length !== 2 || parts.some(part => !part)) throw new InputError('请用一个 & 分隔两个非空选项，例如 do & donot。')
  return `结果是 ${parts[rng(0, 2)]} !`
}

module.exports = { defaults, InputError, roll, choose }
