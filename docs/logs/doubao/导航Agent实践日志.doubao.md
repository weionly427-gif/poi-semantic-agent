# 导航 Agent 实践日志（豆包版）

> 一期范围：输入中文导航指令 → 输出语义 JSON；真实定位、检索、营业状态由二阶段处理。
> 数据来源：线上网页接口抽样 8 组 31 条（测试城市上海，默认地标静安寺）；离线脚本 `eval.doubao.mjs` 38 条一阶段评测，明细见 `eval-result.doubao.json`。

## 三问模板（每条 case 按此填写）

- **① 用户要什么**：指令原话 + 上下文（上一轮 frame / 候选列表）+ 可判定的验收标准（硬条件 / 偏好 / 范围 / 排序）。
- **② 系统听懂了吗**：模型原始 JSON → 校验后 frame → 提交检索的请求参数。
- **③ 实际返回了什么、做到了吗**：高德返回事实，逐条对照标准判通过 / 未通过，标注问题归属层与 bug 编号。

### 问题归属层

| 层级 | 含义 |
|---|---|
| 语义层 | 模型理解偏差：类别、数值归属、软硬条件、继承关系等抽错 |
| 程序层 | 校验 / 兜底 / 状态传递改错或漏清字段 |
| 检索映射层 | frame 条件没有正确映射成高德请求（半径、关键词、过滤、排序） |
| 外部数据层 | 高德返回本身的类别精度、字段缺失 |
| 健壮性 | 限流 429、超时、非法结构校验拒绝、连接中断 |

### Bug 编号对照

| 编号 | 问题 | 层级 |
|---|---|---|
| B1 | 新任务未清除模型误带的旧 scope / 条件 | 程序层 |
| B2 | 操作类意图被 follow_up 降级；指称未挂 `target.reference` | 程序层 / 语义层 |
| B3 | 检索半径写死 3000 米，距离条件未透传 | 检索映射层 |
| B4 | 硬条件检索后未本地核验，超限结果被放出 | 检索映射层 |
| B5 | "最好 / 尽量"软偏好被写成硬条件 | 语义层 |
| B6 | 改口只改上限，同属性下限被丢弃 | 语义层 / 程序层 |
| B7 | 偏好（距离 / 评分）未在检索结果排序执行 | 检索映射层 |
| B8 | `any_of` 多类别检索不支持 | 检索映射层 |
| E1 | 限流 / 超时 / 非法结构导致 502，未取得结果 | 健壮性 |
| E2 | 线上样本未留存模型原始 JSON，只留了校验后 frame | 健壮性 / 流程 |

> 检索请求统一背景：周边（around）请求 `location=地标经纬度`、`radius=3000`（`home-search.mjs` 固定值）、`sortrule=weight` 综合排序；文本（text）请求 `region=上海, city_limit=true`。条目内只记与默认值的偏差。线上样本未抓包，radius 依据代码固定值与摘要"周边 3 公里"推断。

---

# 第一部分　A–H 测试分类总表

| 组 | 测试主题 | 覆盖能力 | 用例 | 关联问题 | 本组结论 |
|---|---|---|---|---|---|
| A | 范围与区域切换 | 地标区域识别、距离上限继承 / 替换、换区域保留条件 | A1–A4 | B3、B4 | 语义层基本正确；距离条件未透传到检索半径，条件未核验 |
| B | 价格条件与偏好 | 价格硬上限、价格软偏好、上限放宽、删条件 + 距离偏好 | B1–B4 | B4、B7、E1 | 上限抽取正确；超限结果未过滤；距离偏好未排序；两轮中断 |
| C | 评分门槛与软硬条件 | 评分硬门槛、软偏好误判硬条件、停车硬条件、删评分留停车 | C1–C4 | B4、B5 | 评分 / 停车条件已写入；"最好"误升硬条件；条件均未核验 |
| D | 缺失目标 / 澄清 / 排序 | 缺目标反问、澄清应答回填、排序依据反问、评分优先 | D1–D4 | B7、E1 | 反问与回填正确；评分偏好未驱动排序；D3 校验拒绝 502 |
| E | 营业状态 / 时间 / 多类别 | `open_now`、`open_at 21:00`、`any_of`、类别收窄 | E1–E4 | B4、B8 | 营业 / 时间条件已识别；未核验；多类别检索被拒 |
| F | 新任务 / 重置 / 候选选择 | 停车硬条件、换地点清旧条件、重置、无列表选择反问 | F1–F4 | B1、E1 | 复测下换地点能清旧条件；首轮多条超时 / 校验错误 |
| G | 数量 / 详情 / 指代 | 数量三家、第二家详情、指代追问 | G1–G3 | B2、E1 | 缺候选时反问合理；引用结构化不稳定；G1/G2 未取得结果 |
| H | 冲突 / 改口 / 沿途 | 条件冲突识别、改口保留下限、沿途范围、偏好切换保留 | H1–H4 | B6、B3、B4 | 冲突识别正确；改口丢下限；沿途首页不可检索；偏好保留正确 |

---

# 第二部分　逐条三问明细（线上 31 条）

## A 组　范围与区域切换

### A1　找静安寺附近的咖啡店

- **① 用户要什么**　上下文：首轮。验收标准：类别＝咖啡店，范围＝静安寺附近。
- **② 系统听懂了吗**
  - 模型原始 JSON：线上未留存（E2）。
  - 校验后 frame：
    ```json
    {"dialogue":{"relation":"new_task","rule_id":"T40"},"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"ready":true}
    ```
  - 检索请求：关键词＝咖啡店，地标＝静安寺，radius=3000，综合排序。
- **③ 实际返回与差距**　返回 5 家：蜜雪冰城(静安寺店) 4.2 分 / 13 元 / 30 米；Peet's 皮爷咖啡 4.6 / 39 / 147 米；星巴克(1788广场店) 4.4 / 30 / 175 米；Blue Bottle 4.7 / 53 / 439 米；看得到风景的咖啡馆 4.6 / 78 / 104 米。类别与范围命中；首项蜜雪冰城偏冷饮，类别精度一般（外部数据层）。**判定：通过（类别精度待优化）。**

### A2　只看一公里以内的。

- **① 用户要什么**　上下文：承接 A1 咖啡店 / 静安寺。验收标准：距离 ≤1 公里。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"dialogue":{"relation":"continue_task","rule_id":"T60"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":1,"unit":"km","raw":"一公里以内"}],"ready":true}
    ```
  - 检索请求：frame 带 `distance≤1km`，但 radius 仍为固定 3000（B3）。
- **③ 实际返回与差距**　返回列表与 A1 相同，摘要仍写"周边 3 公里"；5 家距离 30–439 米，样本内均在 1 公里内，无法据此证明越界结果被拦截。**判定：语义层通过；检索映射层未透传半径（B3），条件未核验（B4）。**

### A3　两公里也行。

- **① 用户要什么**　上下文：承接 A2。验收标准：距离上限放宽到 2 公里，替换原 1 公里。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"dialogue":{"relation":"continue_task","rule_id":"T60"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}],"ambiguity":{"type":"approx","field":"distance","raw":"两公里"},"ready":true}
    ```
  - 检索请求：radius 仍固定 3000（B3）。
- **③ 实际返回与差距**　条件已替换为 2 公里，但摘要仍为 3 公里，返回列表未变。**判定：语义层通过；B3 半径未透传，B4 未核验。**

### A4　换到徐家汇，其他条件不变。

- **① 用户要什么**　上下文：承接 A3。验收标准：区域改徐家汇，保留 2 公里距离条件与咖啡店类别。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"dialogue":{"relation":"new_task","rule_id":"T30"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"徐家汇"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}],"ambiguity":{"type":"approx","field":"distance","raw":"两公里"},"ready":true}
    ```
  - 检索请求：地标取"徐家汇源"，radius=3000（B3）。
- **③ 实际返回与差距**　肯悦咖啡新美罗店 4.2 / 18 / 9 米；星巴克臻选(美罗城店) 4.5 / 46 / 101 米；JUMPCAFE 4.7 / 126 / 127 米；Hey Barista 4.6 / 54 / 278 米；茶百道 4.1 / 19 / 172 米。区域切换与条件保留正确；半径仍 3 公里（B3），条件未核验（B4）。**判定：语义层通过；检索映射层 B3/B4。**

## B 组　价格条件与偏好

### B1　找静安寺附近的餐厅，人均不超过 80 元。

- **① 用户要什么**　上下文：首轮。验收标准：类别＝餐厅，人均 ≤80 元（硬条件）。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"人均不超过80元"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}
    ```
  - 检索请求：关键词＝餐厅，radius=3000；价格条件未参与过滤（B4）。
- **③ 实际返回与差距**　龙记 85 元 / 4.3；火烧云 123 / 4.8；毛头老爹 110 / 4.7；COMMUNEMAISON 93 / 4.6；新白鹿 65 / 4.6。5 家中 4 家超 80 元（85、123、110、93），仅 65 元达标。复测结果相同。**判定：语义层通过；检索映射层 B4 硬条件未核验，超限结果被放出。**

### B2　最好便宜点。

- **① 用户要什么**　上下文：承接 B1 餐厅。验收标准：价格低优先（软偏好，不设门槛）。
- **② 系统听懂了吗**　未取得 frame：首轮 SSL 连接中断；复测 502 超时（E1）。
- **③ 实际返回与差距**　无结果。低价排序未验证。**判定：健壮性 E1，需补测。**

### B3　预算放宽到 120 元。

- **① 用户要什么**　上下文：承接 B1。验收标准：人均上限放宽到 120 元，替换原 80 元。
- **② 系统听懂了吗**
  - 首轮连接中断（E1）。复测 frame：
    ```json
    {"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":120,"unit":"CNY","raw":"预算放宽到120元"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
  - 检索请求：价格条件未过滤（B4）。
- **③ 实际返回与差距**　列表同 B1，含 123 元的火烧云（超 120）。**判定：语义层通过；B4 未核验，123 元越界放出。**

### B4　不用管价格了，找近一点的。

- **① 用户要什么**　上下文：承接 B3。验收标准：删除价格条件，增加距离近优先（软偏好）。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[],"preferences":[{"field":"distance","direction":"lower"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
  - 检索请求：距离偏好未参与排序（B7）。
- **③ 实际返回与差距**　距离依次 78、206、148、212、245 米，未按近到远排列。**判定：语义层通过；检索映射层 B7 偏好未执行排序。**

## C 组　评分门槛与软硬条件

### C1　找静安寺附近评分至少 4.5 分的餐厅。

- **① 用户要什么**　上下文：首轮。验收标准：类别＝餐厅，评分 ≥4.5（硬条件）。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}
    ```
  - 检索请求：评分条件未过滤（B4）。
- **③ 实际返回与差距**　首项龙记 4.3 分（低于 4.5）；其余 4.8、4.7、4.6、4.6。**判定：语义层通过；B4 未核验，4.3 分越界放出。**

### C2　最好能停车。

- **① 用户要什么**　上下文：承接 C1（餐厅 + 评分 ≥4.5）。验收标准：停车为软偏好（最好有），不应进硬条件。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
  - 停车被写入 constraints 硬条件（B5）。
- **③ 实际返回与差距**　列表同 C1，首项仍 4.3 分；无停车证据。**判定：语义层 B5，软偏好误升硬条件；叠加 B4 未核验。**

### C3　停车是必须的。

- **① 用户要什么**　上下文：承接 C2。验收标准：停车为硬条件（必须有）。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
- **③ 实际返回与差距**　5 家均无停车字段证据，无法确认满足；条件标注"尚未核验"。**判定：语义层通过；B4 硬条件未核验。**

### C4　评分不限，停车还是必须的。

- **① 用户要什么**　上下文：承接 C3。验收标准：删除评分条件，保留停车硬条件。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
- **③ 实际返回与差距**　评分条件已删除、停车保留；停车仍未核验（B4）。**判定：语义层通过；检索映射层 B4。**

## D 组　缺失目标 / 澄清 / 排序

### D1　帮我找一个。

- **① 用户要什么**　上下文：首轮，无目标。验收标准：识别目标缺失，反问想找什么地方。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"clarify","ready":false,"missing":["target"],"ambiguity":{"type":"missing_target","field":"target","raw":"帮我找一个。"},"follow_up":"你想找什么地方？","dialogue":{"relation":"new_task","rule_id":"T40","active_task":{"intent":"search","missing":["target"]}}}
    ```
- **③ 实际返回与差距**　正确追问，未进入检索。**判定：通过。**

### D2　咖啡店。

- **① 用户要什么**　上下文：回答 D1 的澄清问题。验收标准：回填类别＝咖啡店，恢复搜索。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"coffee_shop"},"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}
    ```
- **③ 实际返回与差距**　返回 5 家咖啡店（同 A1 列表）。澄清应答回填正确。**判定：通过。**

### D3　排名靠前的几家。

- **① 用户要什么**　上下文：承接咖啡店任务。验收标准：明确要求排序但未给依据，应反问评分还是人气。
- **② 系统听懂了吗**　未取得 frame：首轮与复测均 502，报错"模型输出无效：语义 JSON 未通过字段校验"（E1）。
- **③ 实际返回与差距**　无结果，预期反问未展示。**判定：健壮性 E1，需复现非法结构样例并补测。**

### D4　按评分。

- **① 用户要什么**　上下文：回答 D3 类排序问题。验收标准：评分高优先，结果按评分降序。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"coffee_shop"},"preferences":[{"field":"rating","direction":"higher"}],"preference_order":["rating"],"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}
    ```
  - 检索请求：评分偏好未参与排序（B7）。
- **③ 实际返回与差距**　评分依次 4.2、4.6、4.4、4.7、4.6，首项 4.2、后有 4.7，未按评分从高到低。**判定：语义层通过；检索映射层 B7 偏好未执行排序。**

## E 组　营业状态 / 时间 / 多类别

### E1　找静安寺附近现在还营业的咖啡店。

- **① 用户要什么**　上下文：首轮。验收标准：类别＝咖啡店，营业中（硬条件，参照当前时间）。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_now","value":true}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}
    ```
  - 检索请求：营业条件未核验（B4）。
- **③ 实际返回与差距**　5 家均带营业时间，但未按营业中过滤；条件标注"尚未核验"。**判定：语义层通过；B4 未核验。**

### E2　我是晚上九点去，到时候还开着就行。

- **① 用户要什么**　上下文：承接咖啡店。验收标准：营业参照 21:00。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
- **③ 实际返回与差距**　候选营业时间均覆盖 21:00，样本不能证明执行了时间过滤（B4）。**判定：语义层通过；B4 待补晚打烊/闭店反例验证。**

### E3　咖啡店或便利店都行。

- **① 用户要什么**　上下文：承接 E2（21:00 条件）。验收标准：类别＝咖啡店 OR 便利店，保留时间条件。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"any_of":[{"category":"coffee_shop"},{"category":"convenience_store"}]},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
  - 检索请求：`any_of` 未被检索层支持（B8）。
- **③ 实际返回与差距**　接口返回"请指定一种地点再搜索"。语义层保留两类正确；检索层不支持多类别 OR。**判定：语义层通过；检索映射层 B8。**

### E4　那就只看便利店。

- **① 用户要什么**　上下文：承接 E3。验收标准：类别收窄为便利店，保留 21:00 条件。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"modify_search","target":{"category":"convenience_store"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}
    ```
- **③ 实际返回与差距**　7-ELEVEn 4.2 / 53 米；么凤士多 3.8 / 107 米；全家(愚园店) 4.2 / 179 米；全家 4.3 / 204 米；全家(万航渡路八店) 4.1 / 220 米。类别收窄正确；营业条件未核验（B4）。**判定：语义层通过；B4。**

## F 组　新任务 / 重置 / 候选选择

### F1　找静安寺附近的餐厅，必须能停车。

- **① 用户要什么**　上下文：首轮。验收标准：类别＝餐厅，停车硬条件。
- **② 系统听懂了吗**　首轮 502 超时（E1）。复测 frame：
  ```json
  {"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}
  ```
  - 检索请求：停车条件未核验（B4）。
- **③ 实际返回与差距**　列表同 B1，无停车证据。**判定：复测语义层通过；B4 未核验；首轮 E1。**

### F2　还是南京东路附近的咖啡店吧。

- **① 用户要什么**　上下文：旧任务＝餐厅 + 停车。验收标准：换地点与类别建立新任务，清除旧停车等条件。
- **② 系统听懂了吗**　首轮 502 校验错误（E1）。复测 frame：
  ```json
  {"intent":"search","target":{"category":"coffee_shop"},"scope":{"area":"南京东路","type":"nearby"},"dialogue":{"relation":"new_task","rule_id":"T30"},"ready":true}
  ```
  旧停车条件已清除。
- **③ 实际返回与差距**　维克多咖啡厅 4.1 / 168 / 71 米；星巴克(外滩店) 4.5 / 30 / 234 米；蜜雪冰城(南京东路店) 4.6 / 9 / 391 米；Peet's(外滩中央广场店) 4.4 / 39 / 118 米；Costa(外滩店) 4.4 / 40 / 244 米。换地点清条件正确。**判定：复测通过；首轮 E1。**

### F3　重新开始对话。

- **① 用户要什么**　验收标准：清空活动任务、候选与待答问题。
- **② 系统听懂了吗**
  ```json
  {"intent":"reset_session","ready":false,"dialogue":{"relation":"reset","rule_id":"T10"}}
  ```
- **③ 实际返回与差距**　重置指令正确，复测可清空有候选的任务。**判定：通过。**

### F4　就第二家。

- **① 用户要什么**　上下文：当前无有效候选列表。验收标准：缺列表时反问，不编造候选 ID。
- **② 系统听懂了吗**　首轮 502 校验错误（E1）。复测 frame：
  ```json
  {"intent":"clarify","follow_up":"当前没有展示候选列表，请告诉我您指的是哪一家？","ambiguity":{"type":"candidate_reference_unavailable","field":"candidate_selection","raw":"就第二家"},"dialogue":{"relation":"continue_task","rule_id":"T70"},"ready":false}
  ```
- **③ 实际返回与差距**　无列表时正确反问，未绑定到新列表序号。**判定：复测通过；首轮 E1。**

## G 组　数量 / 详情 / 指代

### G1　找静安寺附近的咖啡店，给我三家。

- **① 用户要什么**　上下文：首轮。验收标准：结果数量＝3（`result_count exact 3`）。
- **② 系统听懂了吗**　首轮与复测均 502 校验错误（E1），未取得 frame。
- **③ 实际返回与差距**　无结果，数量解析未验证。**判定：健壮性 E1，需补测。**

### G2　看看第二家。

- **① 用户要什么**　上下文：前置列表未建立。验收标准：详情意图 + 候选引用 ordinal=2。
- **② 系统听懂了吗**　首轮超时、复测 502 校验错误（E1），未取得 frame。
- **③ 实际返回与差距**　无结果。**判定：健壮性 E1，需补测。**

### G3　它几点关门？

- **① 用户要什么**　上下文：缺少有效候选。验收标准：详情/营业时间意图，指称挂候选引用，缺列表时反问店名。
- **② 系统听懂了吗**
  - 首轮 frame：
    ```json
    {"intent":"clarify","target":{"reference":{"label":"it"}},"missing":["candidate_id"],"ambiguity":{"type":"missing_reference","field":"candidate_id","raw":"它"},"dialogue":{"relation":"continue_task","rule_id":"T60"},"follow_up":"请问您指的是哪一家店？","ready":false}
    ```
  - 复测 frame（引用未保留，关系被判 new_task）：
    ```json
    {"intent":"clarify","ambiguity":{"type":"missing_reference","field":"candidate","raw":"它"},"missing":["candidate"],"dialogue":{"relation":"new_task","rule_id":"T40"},"follow_up":"请问您想查询哪家店的关门时间？","ready":false}
    ```
- **③ 实际返回与差距**　缺候选时反问合理；两轮指称结构化与关系判断不一致（B2）。**判定：反问通过；B2 引用结构化不稳定。**

## H 组　冲突 / 改口 / 沿途

### H1　找人均至少 100 元、最多 80 元的餐厅。

- **① 用户要什么**　上下文：首轮。验收标准：识别价格区间互斥，标记冲突并追问。
- **② 系统听懂了吗**
  ```json
  {"intent":"clarify","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"gte","value":100,"unit":"CNY","raw":"至少100元"},{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"最多80元"}],"ambiguity":{"type":"conflict","field":"price_per_person","raw":"人均至少100元、最多80元"},"dialogue":{"relation":"new_task","rule_id":"T40"},"follow_up":"人均预算是100元以上，还是80元以内？","ready":false}
  ```
- **③ 实际返回与差距**　两条冲突条件均保留，正确追问预算。**判定：通过。**

### H2　刚才说错了，最多 180 元。

- **① 用户要什么**　上下文：承接 H1（下限 100 / 上限 80 冲突）。验收标准：只替换上限为 180，原下限 100 应保留。
- **② 系统听懂了吗**
  ```json
  {"dialogue":{"relation":"continue_task","rule_id":"T50"},"intent":"search","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"lte","value":180,"unit":"CNY","raw":"最多180元"}],"ready":true}
  ```
  下限 100 元丢失（B6）。
- **③ 实际返回与差距**　列表含 65、85、93 元等低于 100 的候选；下限未保留。**判定：语义层 / 程序层 B6，改口未保留同属性另一约束；叠加 B4 未核验。**

### H3　沿途找个充电站，最多绕十分钟，最好有洗手间。

- **① 用户要什么**　上下文：首轮。验收标准：类别＝充电站，范围＝沿途，绕行 ≤10 分钟（硬），洗手间（偏好）。
- **② 系统听懂了吗**
  ```json
  {"dialogue":{"relation":"new_task","rule_id":"T30"},"intent":"search","target":{"category":"charger"},"scope":{"type":"along_route"},"constraints":[{"field":"detour_time","op":"lte","value":10,"unit":"min"}],"preferences":[{"field":"restroom","value":true}],"ready":true}
  ```
- **③ 实际返回与差距**　首页非导航态，提示"请指定附近的地点"；沿途范围一期不下发检索。绕行上限与设施偏好区分正确。**判定：语义层通过；沿途检索属二阶段能力，当前提示合理。**

### H4　那就找静安寺附近的充电站，最好有洗手间。

- **① 用户要什么**　上下文：承接 H3。验收标准：范围改附近地标静安寺，保留洗手间偏好，清除绕行时间。
- **② 系统听懂了吗**
  ```json
  {"intent":"search","target":{"category":"charger"},"scope":{"type":"area","area":"静安寺"},"preferences":[{"field":"restroom","value":true}],"dialogue":{"relation":"new_task","rule_id":"T30"},"ready":true}
  ```
- **③ 实际返回与差距**　逸安启超充 3.6 / 181 米；依威能源 2.1 / 191 米；蔚来能源 3.8 / 196 米；特斯拉超充 3.8 / 205 米；国家电网 3.5 / 211 米。切换附近、清绕行、留偏好正确；洗手间偏好未核验（B4）。**判定：语义层通过；B4。**

---

# 第三部分　离线一阶段失败样例（无高德检索）

### I1　打电话给那家店（离线用例 12）

- **① 用户要什么**　验收标准：意图＝call，指称"那家店"挂 `target.reference`；无候选时缺引用反问。
- **② 系统听懂了吗**
  - 模型原始 JSON：`intent=call`，指称只写进 `ambiguity.raw`，未挂 reference。
  - 校验后 frame：程序见到 `follow_up` 把 intent 改成 `clarify`：
    ```json
    {"intent":"clarify","ambiguity":{"type":"missing_reference","field":"candidate","raw":"那家店"},"dialogue":{"relation":"new_task","rule_id":"T40"},"follow_up":"请问您想给哪家店打电话？","ready":false}
    ```
- **③ 实际返回与差距**　未进入检索。**判定：B2——操作类意图被降级，指称未结构化。**

### I2　帮我找个加油站（离线用例 M3，旧任务＝中山公园餐厅）

- **① 用户要什么**　验收标准：新任务，清除旧区域"中山公园"与旧条件。
- **② 系统听懂了吗**
  - 校验后 frame：
    ```json
    {"intent":"search","target":{"category":"gas"},"scope":{"type":"area","area":"中山公园"},"dialogue":{"relation":"new_task","rule_id":"T30"},"ready":true}
    ```
  - 关系判定 new_task/T30 正确，但 `scope.area` 沿用旧值。
- **③ 实际返回与差距**　离线无检索。**判定：B1——新任务程序未主动剔除模型误带的旧 scope。**

### 复测记录位

| 日期 | 用例 / 改动 | 结果 | 备注 |
|---|---|---|---|
| 2026-11-17 | 离线 17「找个评分至少 4 分的餐厅」429 超时 | 复测通过，`rating gte 4` 正确 | 限流偶发，非语义问题 |
|  |  |  |  |

## 下一条（复制模板）

**日期｜一句话描述这次想弄清的问题**

- **① 用户要什么**　指令 / 上下文 / 验收标准。
- **② 系统听懂了吗**　模型原始 JSON / 校验后 frame / 检索请求。
- **③ 实际返回与差距**　高德事实 / 对照判定 / 问题层级与 bug 编号。


## 从旧版保留的离线评测汇总

以下为历史测量，非本次重新运行结果。原脚本 eval.mjs 现为 tests/doubao/eval.doubao.mjs，结果见 tests/doubao/results/eval-result.doubao.json。

## 2026-11-17｜离线脚本批量评测 38 条（30 主用例 + 8 多轮）

- **要验证什么**　脱离网页和高德检索，只测一阶段语义解析：意图、类别/品牌、范围、数值归属、硬/软条件、区间近似、条件冲突、多轮继承与澄清，在真实模型下的通过率、耗时与失败样例。
- **做了什么**　新增 `eval.mjs`：30 条主用例覆盖 spec P0–P2，8 条多轮（补充、替换、新任务、澄清应答、候选选择、同句改口、删条件、多目标）；逐条调 `parse`，对照声明式断言，记录原始返回、耗时与 HTTP 状态，结果落 `eval-result.json`。密钥取自备用 `.env`。首轮串行触发 HTTP 429，脚本加 1.2s 间隔与 429 退避重试后重跑。
- **看到了什么**
  - 脚本直判 35/38 通过（92.1%）。其中 1 条（17「找个评分至少4分的餐厅」）为 429 后 30s 超时，单独复测通过（`rating gte 4` 正确）；剔除限流偶发后真实语义失败 2 条。主用例 29/30，多轮 7/8。
  - 平均解析 3.74s（被超时样例拉高），正常样例 1.4–6.1s；反问/歧义共 10 条次。
  - 真实失败样例：
    1. **「打电话给那家店」**：模型原始 `intent=call` 正确，但指称"那家店"只写进 `ambiguity.raw`，未挂到 `target.reference`；程序只要带 `follow_up` 就把 intent 改成 `clarify`，call 被降级成反问。
    2. **多轮「帮我找个加油站」**（旧任务＝中山公园餐厅）：`relation=new_task / T30` 判断正确，但 `scope.area` 仍沿用旧值"中山公园"；新任务场景程序未主动清除模型误带的旧 scope/条件。模型还多给了排序依据反问，程序兜底已删除。
  - 观察项：「找个充电站」被补了默认 `scope.type=nearby`（spec 要求只记录用户表达，不补默认范围）；首轮曾出现模型返回非法结构被字段校验拒绝（线上 D3/G1 等同类 502），本轮重跑未复现。
- **下一步**
  1. 修 D1：提示词要求操作类意图把指称写入 `target.reference`；复核 `agent.mjs` 中"有 follow_up 即转 clarify"对 call/select/details 等操作意图不要降级。
  2. 修 D2：`relation=new_task`（T30/T40）时，程序主动剔除旧 scope、constraints、preferences、preference_order，不只依赖模型不复制。
  3. 把本轮 30 条主用例沉淀进 `agent.test.mjs` 的离线 mock 回归；限流场景保留间隔/退避与超时提示。
  4. 与线上 31 条记录合并看：半径固定 3 公里、条件未核验、"最好"误写成硬条件、排序不按评分、价格改口丢下限、`any_of` 不支持检索，分别对应阶段 A / B / E。

