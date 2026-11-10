# POI 一阶段文本 Agent

输入中文导航需求，输出语义 JSON。Node.js 22 或以上，无第三方依赖。

复制 .env.example 为 .env，在本机填写硅基流动密钥。也可直接指定已有配置文件的路径。服务地址固定为硅基流动官方 API。密钥只在请求头中使用。

```sh
node --env-file=.env cli.mjs
node --env-file=.env cli.mjs "沿途找个充电站，最多绕十分钟，最好有洗手间"
node --test agent.test.mjs
```

交互模式传递上一轮成功的语义结果，/new 重置。调用 parse(text,{previous,candidates,choices}) 可传入历史结果、展示的候选和澄清选项。候选包含 candidate_id、ordinal（从1开始）、list_version。语义规则见 spec.md，字段校验见 agent.mjs。模型超时或两次生成无效结构时返回错误。规则通过提示词驱动，业务准确率需要用真实输入持续评测。

GitHub 上传源文件即可，私钥留在本机。
