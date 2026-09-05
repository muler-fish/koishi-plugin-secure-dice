'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { roll, choose, InputError } = require('../lib/random')

test('closed intervals include both endpoints, negative and equal bounds', () => {
  for (const [min, max] of [[0, 20], [-100, 100], [-20, -1], [0, 0], [-1e9, 1e9]]) {
    for (const upper of [false, true]) {
      assert.equal(roll(`[${min},${max}]`, {}, (a, b) => {
        assert.equal(a, min); assert.equal(b, max + 1)
        return upper ? b - 1 : a
      }), `区间 [${min},${max}] 的结果是 ${upper ? max : min}！`)
    }
  }
})
test('standard dice use inclusive 1..sides', () => {
  for (const sides of [4, 6, 8, 10, 12, 20, 100]) {
    assert.equal(roll(`D${sides}`, {}, (a, b) => {
      assert.equal(a, 1); assert.equal(b, sides + 1); return b - 1
    }), `1d${sides}[${sides}] = ${sides}`)
  }
})
test('multiple rolls, signed modifiers and mixed expressions', () => {
  const values = [2, 4, 8]
  assert.equal(roll('3d10+1', {}, () => values.shift()), '3d10[2, 4, 8] + 1 = 15')
  assert.equal(roll('2d6 + 1D4 - 2', {}, a => a), '2d6[1, 1] + 1d4[1] - 2 = 1')
  assert.equal(roll('-D6+2', {}, a => a), '-1d6[1] + 2 = 1')
})
test('unsupported sides fail before drawing, even with old configuration', () => {
  for (const sides of [0, 1, 2, 3, 5, 7, 11, 13, 99, 101, 1000000]) {
    assert.throws(() => roll(`2d6+D${sides}`, { maxSides: 1000000 }, () => assert.fail('must not draw')),
      { message: '不支持该骰子面数。支持的面数：D4、D6、D8、D10、D12、D20、D100。' })
  }
})
test('reject invalid input before drawing', () => {
  for (const value of ['', '[20,0]', '[0,1.5]', '[0,1000000001]', '[1,2]x', 'D0', '0d6', '101d6', '60d6+41d6', 'D1000001', 'd6++1', 'd6*2', 'd6 1', '3 d6', '1', 'd6+1000000001', 'process.exit()', 'd6+'.repeat(200)]) {
    assert.throws(() => roll(value, {}, () => assert.fail('must not draw')), InputError, value)
  }
  assert.throws(() => roll('3d6', { maxDice: 2 }), InputError)
})
test('binary choice maps the two equally sized outcomes and retains spaces', () => {
  for (const [index, expected] of [[0, 'do it'], [1, 'do not']]) {
    assert.equal(choose(' do it & do not ', {}, (a, b) => {
      assert.equal(a, 0); assert.equal(b, 2); return index
    }), `结果是 ${expected} !`)
  }
  for (const value of ['', 'do', 'do &', '& no', 'a & b & c']) assert.throws(() => choose(value), InputError)
})
test('real crypto source smoke test (not a statistical proof)', () => {
  for (let i = 0; i < 50; i++) {
    assert.match(roll('[0,1]'), /结果是 [01]！$/)
    assert.match(roll('D6'), /^1d6\[[1-6]\] = [1-6]$/)
    assert.match(choose('yes & no'), /^结果是 (yes|no) !$/)
  }
})
