# POI 一阶段文本 Agent

输入中文导航需求，输出语义 JSON。Node.js 22 或以上，无第三方依赖。

复制 .env.example 为 .env，在本机填写硅基流动密钥。也可直接指定已有配置文件的路径。服务地址固定为硅基流动官方 API。密钥只在请求头中使用。

```sh
node --env-file=.env cli.mjs
node --env-file=.env cli.mjs "沿途找个充电站，最多绕十分钟，最好有洗手间"
node --test tests/unit/*.test.mjs
```

交互模式传递上一轮成功的语义结果，/new 重置。调用 parse(text,{previous,candidates,choices}) 可传入历史结果、展示的候选和澄清选项。候选包含 candidate_id、ordinal（从1开始）、list_version。语义规则见 [rules/spec.md](rules/spec.md)，字段校验见 [src/agent.mjs](src/agent.mjs)。模型超时或两次生成无效结构时返回错误。规则通过提示词驱动，业务准确率需要用真实输入持续评测。

GitHub 上传源文件即可，私钥留在本机。

## 对话规则更新

[rules/dialogue-policy.json](rules/dialogue-policy.json) 定义任务关系与澄清规则及优先级，由 src/agent.mjs 在启动时加载。新任务不带旧条件，继续追问按语义继承。需要澄清时网页显示 follow_up，完整保留待澄清上下文，下轮回答用于补全原任务。当前任务由浏览器回传，刷新页面会开始空白对话。

部署时保留目录结构，上传根目录入口、package.json，以及 src/、rules/、frontend/。启动入口仍是 `node web.mjs`（或 `npm start`）。Render 重新部署后刷新网页；本地修改不会自动改变线上服务。

JSON 中的自然语言判断由模型执行。程序负责状态传递、校验、显式重置和部分反问约束。真实语义判断仍可能出错，需要根据实际样例继续评测。

## 文件分类导航

`eval` 是 evaluation（评测）的缩写。Codex、豆包目录表示文件的编写来源；实际调用哪个模型由配置决定。

| 文件夹／入口 | 用途 | 常用文件 |
|---|---|---|
| src/ | Agent 与检索运行代码 | [语义解析](src/agent.mjs)、[高德检索](src/home-search.mjs) |
| rules/ | 规格、对话规则、地点类别字典 | [语义规格](rules/spec.md)、[上下文继承与重置](rules/对话上下文继承与重置规则.md)、[对话规则配置](rules/dialogue-policy.json)、[类别字典](rules/kinds.json) |
| frontend/ | HTML 前端页面 | [网页原文](frontend/index.html) |
| tests/unit/ | 不调用真实外部接口的回归测试 | [语义测试](tests/unit/agent.test.mjs)、[距离测试](tests/unit/home-search.test.mjs) |
| tests/codex/ | Codex 编写的实测脚本，results/ 保存结果 | [本地距离实测](tests/codex/eval-a-radius.mjs)、[线上距离实测](tests/codex/eval-a-radius-online.mjs) |
| tests/doubao/ | 豆包编写的评测脚本，results/ 保存结果 | [评测脚本](tests/doubao/eval.doubao.mjs)、[评测结果](tests/doubao/results/eval-result.doubao.json) |
| docs/logs/codex/ | Codex 实践日志和按轮次记录的 case | [Codex 日志](docs/logs/codex/导航Agent实践日志.codex.md) |
| docs/logs/doubao/ | 豆包实践日志 | [豆包日志](docs/logs/doubao/导航Agent实践日志.doubao.md) |
| docs/优化计划.md | 后续优化计划与当前进度 | [优化计划](docs/优化计划.md) |
| 根目录 | 启动入口与项目配置 | web.mjs、cli.mjs、启动测试网页.cmd、package.json、.env.example |

在根目录运行测试脚本，例如 `node tests/codex/eval-a-radius-online.mjs`。评测会调用真实服务；结果保存在对应编写来源的 results/ 目录。历史日志中的文件名及旧命令保留当时记录，以本页当前路径为准。

## 距离修复范围

当前本地检索读取顶层 distance 的 lte／lt 硬上限，支持 m／km 单位，传给周边查询并按返回距离过滤；摘要同步显示半径。缺少距离数据的候选在有硬上限时不展示。默认仍为3公里；其他条件与偏好继续标记尚未核验。复合条件、模糊距离及其他距离运算暂未接入本次修复。

查询距离是相对所选地标的周边距离；前五家满足更小范围时，改变半径后仍可能返回同样店铺。固定五条结果不表示该范围内只有五家。
