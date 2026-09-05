# Secure Dice 骰娘

Koishi 4 插件。无需数据库、外部随机数服务或 API 密钥。

## 指令

| 输入 | 行为 |
| --- | --- |
| `dice [0,20]` | 0 到 20 的随机整数，包含两端 |
| `dice [-100,100]` | 支持负数 |
| `dice [5,5]` | 返回 5 |
| `dice D20` | 一颗 20 面骰，结果 1 到 20 |
| `dice D11` | 自定义面数；默认允许 1 到 1,000,000 面 |
| `dice 3d10+1` | 三颗十面骰的和加 1，显示每颗点数 |
| `dice 2d6+1d4-2` | 多组骰子与整数加减 |
| `dice do & donot` | 两个选项各 50%，回复 `结果是 do !` 或另一项 |
| `dice 去吃火锅 & 在家做饭` | 选项可以包含空格和中文 |

D 不区分大小写，支持 D4、D6、D8、D10、D12、D20、D100 以及自定义面数。
加减号周围可以有空格，骰子内部请写成 `3d10`。不支持乘除、括号、爆骰或取最高/最低。
区间端点必须是 ±1,000,000,000 内的整数，不会自动交换写反的上下限。
默认每次最多 100 颗骰子，输入最多 500 个字符；控制台可调低数量限制。
二元判断必须恰好包含一个 `&`，选项本身不能包含 `&`。

## 配置与命令前缀

控制台中可设置 `command`（默认 `dice`）。无需功能后缀，含 `&` 的输入自动进行二选一，其余解析为区间或骰子表达式。
例如改为 `roll` 后，使用 `roll [0,20]`、`roll do & donot`。
Koishi 的全局调用前缀仍然有效：若设置为 `/`，使用 `/dice D20`。
多人群聊是否需要前缀或 @，由现有 Koishi 全局配置控制。

## 安装

这是本地插件包，尚未发布到 npm。源码是可直接运行的 CommonJS，无需编译。

在本目录执行 `npm install`、`npm test`、`npm run check` 和 `npm pack`。
将生成的 `koishi-plugin-secure-dice-0.1.0.tgz` 上传至 Koishi 项目目录；在该项目目录内执行：

```sh
npm install ./koishi-plugin-secure-dice-0.1.0.tgz
```

若宿主使用 Yarn，请使用 `yarn add ./koishi-plugin-secure-dice-0.1.0.tgz`，保持宿主包管理器一致。
随后在 Koishi 控制台添加并启用 `secure-dice` 插件；必要时重启 Koishi 以刷新插件列表。
已有 YAML 配置也可在现有 `plugins` 下添加（不要覆盖其它插件）：

```yaml
plugins:
  secure-dice:
    command: dice
    maxDice: 100
    maxSides: 1000000
    maxInputLength: 500
```

## 随机性与边界

使用 Node.js `node:crypto` 的 `randomInt(min, max)`，以密码学安全随机源生成整数，避免取模偏差；
将排他的上界加一，实现包含两端的区间。每颗骰子单独抽样，二选一直接抽取 0 或 1。
密码学安全随机数不等于物理真随机，也不承诺短期结果均匀、不会连出相同点数或可公开验证公平性。
不使用 `Math.random()`，不使用 `eval()`，不在随机源故障时降级为弱随机算法。
用户选项以纯文本消息元素输出，避免被当作 @、图片等消息元素发送。

官方参考：[Node.js crypto](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback)、
[Koishi 指令开发](https://koishi.chat/zh-CN/guide/basic/command)。

