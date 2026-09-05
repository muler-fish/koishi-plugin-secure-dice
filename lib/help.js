'use strict'

exports.formatHint = (command, kind) => {
  const forms = { range: `${command} [下限,上限]`, dice: `${command} 数量d面数±修正值`, choice: `${command} 选项一 & 选项二` }
  return forms[kind] ? `格式错误。正确格式为 ${forms[kind]}` : `格式错误。正确格式为：\n${Object.values(forms).join('\n')}`
}

exports.help = ({ command = 'dice', maxDice, maxInputLength }) => `${command} 使用方法
以下“下限、上限、数量、面数、修正值、选项”都是可替换参数，不是固定内容。

1. 随机整数：${command} [下限,上限]
   两端都包含，支持负整数，下限不能大于上限。
   示例：${command} [-100,100]

2. 投骰：${command} 数量d面数±修正值
   支持 D4、D6、D8、D10、D12、D20、D100，D 不区分大小写。
   数量省略时为 1；修正值可省略；支持多组骰子加减。

3. 二选一：${command} 选项一 & 选项二 两项由你自由填写，各有 50% 概率。用一个半角 & 分隔，两项均不能为空。 示例：${command} 是 & 否

限制：区间端点在 ±1000000000 内；每次最多 ${maxDice} 颗骰子；输入最多 ${maxInputLength} 个字符。 输入 ${command} help 或仅输入 ${command} 可查看本说明。群聊调用前缀或 @ 要求沿用机器人设置。`
