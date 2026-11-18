# 导航 Agent 实践日志

每次实验写一条。开始时填「要验证什么」，结束时补「做了什么、看到了什么、下一步」。

## 2026-11-17｜一公里的条件传到高德了吗？

- **要验证什么**　用户要求在地标周围一公里内找咖啡店。预期发给高德的周边搜索半径为 1000 米。
- **做了什么**　我先查看了模型输出的 JSON，确认距离条件正确。Codex 随后在本地把带有一公里限制的条件交给检索程序，用模拟地图接口记录程序发出的请求。
- **看到了什么**　本地请求里的 `radius` 为 `3000`。查看检索代码，发现周边搜索使用了固定半径。线上版本是否相同仍待确认。
- **下一步**　待修改并复测。分别输入一公里和两公里，检查请求是否对应 1000 米和 2000 米，再核对展示地点的距离。复测后把实际结果追加在这里。


## 第一轮测试｜2026-11-17｜线上测试结果

共 8 组、31 条。按组从上往下读，同组保留上文。以下是线上接口实际回复；网页展示尚未逐条核对。


编号说明：用例编号见各条标题；“定位与编号”中的 B3–B8 沿用修复方案编号。本地回放使用模拟地图响应，只验证本地代码会生成哪些参数。

### 八组用例总览

```text
导航助手的 31 条对话用例
├─ 用户给了找店条件，结果是否照做？
│  ├─ A 范围和地点（A1–A4）　从一公里改到两公里，再换地标，范围跟着变了吗？
│  ├─ B 价格和距离（B1–B4）　预算能否限制结果？取消预算后，近的店排在前面吗？
│  ├─ C 评分和停车（C1–C4）　评分门槛守住了吗？“最好停车”和“必须停车”有区别吗？
│  └─ E 营业时间和类别（E1–E4）　把“现在”改为晚上九点，再换店铺类别，时间条件还在吗？
├─ 用户接着说一句，助手知道在说什么吗？
│  ├─ D 追问与排序（D1–D4）　信息不全时会问吗？回答“按评分”后，结果顺序对吗？
│  ├─ F 换任务与重置（F1–F4）　开始新搜索会清掉旧条件吗？重置后还会误选旧店吗？
│  └─ G 选择一家店（G1–G3）　“第二家”选对了吗？接着问“它几点关门”时还是那家吗？
└─ 条件矛盾或当前办不到时，助手怎样继续？
   └─ H 条件冲突与路线（H1–H4）　预算矛盾时能否澄清？没有路线时能否转为附近搜索？
```

### A 组｜范围和地点

检查修改半径或地标后，查询范围和结果是否跟着变化。

#### A1　找静安寺附近的咖啡店。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近的咖啡店。
- 首轮上下文　新对话，无历史或候选
- 本轮验收　咖啡店；静安寺附近。以静安寺为中心，查找咖啡店。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别为静安寺附近的咖啡店。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"}}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序
- 关键事实　返回 5 家，首项是蜜雪冰城，地图类别为冷饮店。位置已用于搜索，类别匹配不够精确。
- **逐项验收**　地点通过；类别未完全通过
- **定位与编号**　检索候选类别；待定位来源（观察项）

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

地点和类别识别正确；五条首项为冷饮店，候选类别不够精确。

- 首轮语义　`{"dialogue":{"relation":"new_task","rule_id":"T40"},"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### A2　只看一公里以内的。

**① 用户要什么（验收标准）**

- 指令原话　只看一公里以内的。
- 首轮上下文　沿用 A1 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　硬条件≤1公里；静安寺附近。保留静安寺和咖啡店，只看一公里内的候选。

**② 系统听懂了吗（中间结果）**

- 理解判断　保留地点和类别，增加一公里上限。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":1,"unit":"km","raw":"一公里以内"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　五家距离为 30、147、175、439、104 米，都符合；摘要仍写 3 公里。样本不能证明半径筛选生效。
- **逐项验收**　语义通过；摘要半径未通过；实际越界未见
- **定位与编号**　检索请求映射 B3

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

1 公里正确继承，检索摘要仍为 3 公里。五条均在 1 公里内，不能由样本推断有越界结果。

- 首轮语义　`{"dialogue":{"relation":"continue_task","rule_id":"T60"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":1,"unit":"km","raw":"一公里以内"}],"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### A3　两公里也行。

**① 用户要什么（验收标准）**

- 指令原话　两公里也行。
- 首轮上下文　沿用 A2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　硬条件改为≤2公里；地点不变。把半径放宽到两公里，其余条件沿用。

**② 系统听懂了吗（中间结果）**

- 理解判断　把一公里替换为两公里。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　五家及顺序与上一轮相同，摘要仍写 3 公里。提示未随条件更新。
- **逐项验收**　上限替换通过；摘要半径未通过
- **定位与编号**　检索请求映射 B3

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

条件已替换成 2 公里，摘要仍为 3 公里，返回列表未变。

- 首轮语义　`{"dialogue":{"relation":"continue_task","rule_id":"T60"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}],"ambiguity":{"type":"approx","field":"distance","raw":"两公里"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### A4　换到徐家汇，其他条件不变。

**① 用户要什么（验收标准）**

- 指令原话　换到徐家汇，其他条件不变。
- 首轮上下文　沿用 A3 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　范围徐家汇；上限2公里。改到徐家汇，仍找两公里内的咖啡店。

**② 系统听懂了吗（中间结果）**

- 理解判断　换成徐家汇，保留咖啡店和两公里上限。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"徐家汇"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=徐家汇 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 徐家汇源周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回徐家汇源周边的地点，摘要仍写 3 公里。换区生效，范围提示仍不一致。
- **逐项验收**　更换区域通过；半径未通过；地标匹配待确认
- **定位与编号**　检索请求映射 B3

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

成功切换区域并保留条件；检索地标取徐家汇源，摘要仍为 3 公里。

- 首轮语义　`{"dialogue":{"relation":"new_task","rule_id":"T30"},"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"徐家汇"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km","raw":"两公里"}],"ambiguity":{"type":"approx","field":"distance","raw":"两公里"},"ready":true}`
- 检索　上海 · 徐家汇源周边 3 公里 · 高德综合排序；附加条件尚未核验；肯悦咖啡新美罗店（4.2分，18.00元，9米，06:00-21:00）、星巴克臻选(美罗城店)（4.5分，46.00元，101米，07:30-22:30）、JUMPCAFE航海王主题餐厅（4.7分，126.00元，127米，10:00-22:00）、Hey Barista（4.6分，54.00元，278米，09:30-18:00）、茶百道(上海TPY中心店)（4.1分，19.00元，172米，10:00-22:00）

</details>

#### A 组距离修复｜验收记录

**目标**　在静安寺连续搜索咖啡店。只修改距离时，搜索中心保持不变，实际发给高德的周边查询半径随上限变化。对应修复方案 B3。

| 用例 | 这一步只改变什么 | 修前半径（本地回放） | 修后应发出的半径 | 修后实测 |
|---|---|---:|---:|---|
| A1 | 首次找静安寺附近的咖啡店，使用默认范围 | 3000 米 | 3000 米 | 待测 |
| A2 | 追加“一公里以内” | 3000 米 | 1000 米 | 待测 |
| A3 | 把上限放宽到两公里 | 3000 米 | 2000 米 | 待测 |

**定位**　A2、A3 的线上语义结果分别记录了 1 公里和 2 公里。本地检索程序组装周边请求时仍固定使用 3000 米。线上发给高德的原始请求未采集。

**下一步**　先把 A1–A3 固定成回归测试，记录每次周边查询的中心坐标和半径。修复后，三次中心应一致，半径应依次为 3000、1000、2000 米；再核对结果摘要是否显示对应半径。现有五家最远仅 439 米，店名列表相同也可能符合预期。

**最后复测 A4**　换到徐家汇时，中心应改变，同时保留上一轮的 2000 米上限。

### B 组｜价格下限、价格上限与高档语义

当前验收采用用户指定的三个独立首轮 case；每条 previous=null、candidates=[]，不构成追问。复测时间：2026-11-17（北京时间）。模型原始输出由本地规则直接调用模型采集，校验后frame发给Render /search，使用服务器高德配置。原始模型与Render检索均HTTP 200。完整证据：`tests/codex/results/eval-b-independent-2026-11-17T10-18-10-492Z.json`。未修改业务代码或规则。旧连续追问记录移至文末历史区。

#### B1　静安寺人均200元以上餐厅

**① 用户要什么（验收标准）**

- 指令原话　静安寺人均200元以上餐厅
- 上下文　独立首轮，无历史、无候选。
- 本轮验收　静安寺的餐厅，人均至少200元，即 ≥200元，包含200元。这是价格下限，不是预算上限；低于200元的候选不符合要求。

**② 系统听懂了吗（中间结果）**

原始 JSON 正确提取 price_per_person / gte / 200 / CNY；gte 表示大于或等于。校验后仅增加 ready:true。模型正确识别了价格下限，没有把200元以上理解成200元以下。

模型原始 JSON（校验前 message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "gte",
      "value": 200,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  }
}
```

<details>
<summary>校验后 frame 与本地检索请求映射</summary>

```json
{
  "frame": {
    "intent": "search",
    "target": {
      "category": "restaurant"
    },
    "scope": {
      "type": "area",
      "area": "静安寺"
    },
    "constraints": [
      {
        "field": "price_per_person",
        "op": "gte",
        "value": 200,
        "unit": "CNY"
      }
    ],
    "dialogue": {
      "relation": "new_task",
      "rule_id": "T40"
    },
    "ready": true
  },
  "fixture_requests": [
    {
      "path": "/v5/place/text",
      "params": {
        "region": "上海",
        "city_limit": "true",
        "keywords": "静安寺",
        "page_size": "1"
      }
    },
    {
      "path": "/v5/place/around",
      "params": {
        "keywords": "餐厅",
        "show_fields": "business,children",
        "page_size": "5",
        "location": "121.445,31.223",
        "radius": "3000",
        "sortrule": "weight"
      }
    }
  ]
}
```

这里的请求来自本地固定响应回放；Render到高德的原始请求未采集。

</details>

**③ 实际返回了什么、做到了吗（事实与差距）**

返回5家，人均依次85、123、110、93、65元，全部低于200元，0/5满足价格下限。这表示系统没有执行≥200元筛选，不表示静安寺没有200元以上的餐厅。定位：src/home-search.mjs 价格下限未核验；本地固定响应回放同样保留低价候选。语义通过，检索不通过。

实际应用返回：

| 餐厅 | 人均（元） |
|---|---:|
| 龙记香港茶餐厅(久光百货店) | 85.00 |
| 浩海火烧云傣家菜(静安芮欧店) | 123.00 |
| 毛头老爹饭店(静安寺店) | 110.00 |
| COMMUNEMAISON幻师(芮欧百货店) | 93.00 |
| 新白鹿餐厅(静安CP店) | 65.00 |

#### B2　静安寺人均100元以下餐厅

**① 用户要什么（验收标准）**

- 指令原话　静安寺人均100元以下餐厅
- 上下文　独立首轮，无历史、无候选。
- 本轮验收　静安寺的餐厅，人均≤100元；本轮按“以下含本数”验收，不含糊改为严格小于。

**② 系统听懂了吗（中间结果）**

原始 JSON 为 price_per_person / lt / 100 / CNY，实际是严格小于100元；按本轮≤100元验收，边界有偏差。校验后仅增加 ready:true，src没有把lte改为lt。现有rules未明确统一以上/以下边界，需补规则和含等值样例。

模型原始 JSON（校验前 message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lt",
      "value": 100,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  }
}
```

<details>
<summary>校验后 frame 与本地检索请求映射</summary>

```json
{
  "frame": {
    "intent": "search",
    "target": {
      "category": "restaurant"
    },
    "scope": {
      "type": "area",
      "area": "静安寺"
    },
    "constraints": [
      {
        "field": "price_per_person",
        "op": "lt",
        "value": 100,
        "unit": "CNY"
      }
    ],
    "dialogue": {
      "relation": "new_task",
      "rule_id": "T40"
    },
    "ready": true
  },
  "fixture_requests": [
    {
      "path": "/v5/place/text",
      "params": {
        "region": "上海",
        "city_limit": "true",
        "keywords": "静安寺",
        "page_size": "1"
      }
    },
    {
      "path": "/v5/place/around",
      "params": {
        "keywords": "餐厅",
        "show_fields": "business,children",
        "page_size": "5",
        "location": "121.445,31.223",
        "radius": "3000",
        "sortrule": "weight"
      }
    }
  ]
}
```

这里的请求来自本地固定响应回放；Render到高德的原始请求未采集。

</details>

**③ 实际返回了什么、做到了吗（事实与差距）**

返回5家，人均85、123、110、93、65元，其中123、110元超出100元，3/5满足本轮预算。线上没有恰好100元候选，不能用线上列表证明等值边界正确。定位：规则/模型的lt与lte边界偏差，以及src/home-search.mjs价格上限未过滤，是两个独立问题。

实际应用返回：

| 餐厅 | 人均（元） |
|---|---:|
| 龙记香港茶餐厅(久光百货店) | 85.00 |
| 浩海火烧云傣家菜(静安芮欧店) | 123.00 |
| 毛头老爹饭店(静安寺店) | 110.00 |
| COMMUNEMAISON幻师(芮欧百货店) | 93.00 |
| 新白鹿餐厅(静安CP店) | 65.00 |

#### B3　静安寺高档餐厅

**① 用户要什么（验收标准）**

- 指令原话　静安寺高档餐厅
- 上下文　独立首轮，无历史、无候选。
- 本轮验收　静安寺的高档餐厅。保留档次要求，不擅自编造人均金额；不能把“高档”直接等同于“评分高”或“人气高”。

**② 系统听懂了吗（中间结果）**

原始 JSON 保留 target.raw=高档餐厅、price_level higher，并未编造金额；但同时输出 ranking_basis 歧义和“你更看重评分，还是人气？”反问。src/agent.mjs 清除无排名触发词情况下的该反问与歧义，最终ready=true。原始模型理解只能判部分通过，不能因为最终frame可执行就判全通过。

模型原始 JSON（校验前 message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant",
    "raw": "高档餐厅"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "preferences": [
    {
      "field": "price_level",
      "direction": "higher",
      "raw": "高档"
    }
  ],
  "ambiguity": {
    "type": "ranking_basis",
    "field": "ranking_basis",
    "raw": "高档",
    "alternatives": [
      "价格",
      "评分",
      "人气"
    ]
  },
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "follow_up": "你更看重评分，还是人气？"
}
```

<details>
<summary>校验后 frame 与本地检索请求映射</summary>

```json
{
  "frame": {
    "intent": "search",
    "target": {
      "category": "restaurant",
      "raw": "高档餐厅"
    },
    "scope": {
      "type": "area",
      "area": "静安寺"
    },
    "preferences": [
      {
        "field": "price_level",
        "direction": "higher",
        "raw": "高档"
      }
    ],
    "dialogue": {
      "relation": "new_task",
      "rule_id": "T40"
    },
    "ready": true
  },
  "fixture_requests": [
    {
      "path": "/v5/place/text",
      "params": {
        "region": "上海",
        "city_limit": "true",
        "keywords": "静安寺",
        "page_size": "1"
      }
    },
    {
      "path": "/v5/place/around",
      "params": {
        "keywords": "餐厅",
        "show_fields": "business,children",
        "page_size": "5",
        "location": "121.445,31.223",
        "radius": "3000",
        "sortrule": "weight"
      }
    }
  ]
}
```

这里的请求来自本地固定响应回放；Render到高德的原始请求未采集。

</details>

**③ 实际返回了什么、做到了吗（事实与差距）**

返回与前两条相同的5家。不能仅根据这些价格断言各店不高档；可确认的是本地请求仅使用“餐厅”，未使用“高档餐厅”，也未执行price_level偏好。定位：模型原始输出多余反问属于语义规则执行问题；src检索没有落实高档要求，尚不能声称筛出了高档餐厅。

实际应用返回：

| 餐厅 | 人均（元） |
|---|---:|
| 龙记香港茶餐厅(久光百货店) | 85.00 |
| 浩海火烧云傣家菜(静安芮欧店) | 123.00 |
| 毛头老爹饭店(静安寺店) | 110.00 |
| COMMUNEMAISON幻师(芮欧百货店) | 93.00 |
| 新白鹿餐厅(静安CP店) | 65.00 |

### C 组｜评分和停车

检查评分门槛，以及“最好停车”和“必须停车”如何影响筛选。

#### C1　找静安寺附近评分至少4.5分的餐厅。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近评分至少4.5分的餐厅。
- 首轮上下文　新对话，无历史或候选
- 本轮验收　硬条件评分≥4.5。评分至少4.5分，含4.5分。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出评分至少 4.5 分。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　首项只有 4.3 分。评分筛选未做到。
- **逐项验收**　门槛识别通过；过滤未通过
- **定位与编号**　检索结果过滤 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

4.5 分门槛识别正确，首项 4.3 分。

- 首轮语义　`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### C2　最好能停车。

**① 用户要什么（验收标准）**

- 指令原话　最好能停车。
- 首轮上下文　沿用 C1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　沿用评分≥4.5；停车为软偏好。保留评分门槛，能停车是偏好。

**② 系统听懂了吗（中间结果）**

- 理解判断　把“最好能停车”记成必须停车，同时保留评分门槛。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回列表仍含 4.3 分餐厅，停车提示未核验。偏好强度已经理解错了。
- **逐项验收**　停车偏好识别未通过；评分过滤未通过
- **定位与编号**　首次偏差见校验后语义 B5；另有检索 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

“最好”被放进硬条件，语义偏离；返回仍含 4.3 分。

- 首轮语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### C3　停车是必须的。

**① 用户要什么（验收标准）**

- 指令原话　停车是必须的。
- 首轮上下文　沿用 C2 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　停车为硬条件；评分≥4.5。把停车升级为硬条件。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出必须能停车。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　五家均缺少可确认停车的证据，接口提示未核验。无法确认满足硬条件。
- **逐项验收**　当前语义通过；评分过滤未通过；停车证据不足
- **定位与编号**　检索条件核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

停车硬条件已写入，结果提示未核验；五家没有停车证据，无法确认满足。

- 首轮语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"rating","op":"gte","value":4.5},{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### C4　评分不限，停车还是必须的。

**① 用户要什么（验收标准）**

- 指令原话　评分不限，停车还是必须的。
- 首轮上下文　沿用 C3 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　去除评分门槛；仍必须停车。删除评分门槛，保留必须停车。

**② 系统听懂了吗（中间结果）**

- 理解判断　删除评分门槛，保留必须停车。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"parking","op":"eq","value":true}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回 5 家，停车仍未核验。条件修改正确，筛选效果未证实。
- **逐项验收**　条件修改通过；停车核验证据不足
- **定位与编号**　检索条件核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

评分要求已删除，停车要求保留；停车仍未核验。

- 首轮语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"area"},"constraints":[{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

### D 组｜追问与排序

检查信息不足时如何追问，以及回答后能否继续原任务并按指定依据排序。

#### D1　帮我找一个。

**① 用户要什么（验收标准）**

- 指令原话　帮我找一个。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　缺目标时询问类别。目标缺失时询问要找哪种地点。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出用户没说要找什么。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","missing":["target"],"follow_up":"你想找什么地方？"}`
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","missing":["target"],"follow_up":"你想找什么地方？"}`
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　你想找什么地方？
- 复测应用返回　你想找什么地方？
- 关键事实　回复“你想找什么地方？”。按预期追问。
- **逐项验收**　追问通过
- **定位与编号**　无

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

正确追问想找什么地方。

- 首轮语义　`{"intent":"clarify","ready":false,"missing":["target"],"ambiguity":{"type":"missing_target","field":"target","raw":"帮我找一个。"},"follow_up":"你想找什么地方？","dialogue":{"relation":"new_task","rule_id":"T40","active_task":{"intent":"search","missing":["target"]}}}`

- 整组复测语义　`{"intent":"clarify","ready":false,"missing":["target"],"ambiguity":{"type":"missing_target","field":"target","raw":"帮我找一个。"},"follow_up":"你想找什么地方？","dialogue":{"relation":"new_task","rule_id":"T40","active_task":{"intent":"search","missing":["target"]}}}`

</details>

#### D2　咖啡店。

**① 用户要什么（验收标准）**

- 指令原话　咖啡店。
- 首轮上下文　沿用 D1 的 frame，候选 0 家；待答问题「你想找什么地方？」
- 复测上下文　沿用 D1 的 frame，候选 0 家；待答问题「你想找什么地方？」
- 本轮验收　补全目标为咖啡店。用咖啡店补全上一轮并继续搜索。

**② 系统听懂了吗（中间结果）**

- 理解判断　将“咖啡店”补作搜索目标。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"}}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"}}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序
- 关键事实　恢复搜索并返回 5 家候选。澄清后可以继续。
- **逐项验收**　澄清后恢复搜索通过
- **定位与编号**　无

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

回答咖啡店后恢复搜索。

- 首轮语义　`{"intent":"search","target":{"category":"coffee_shop"},"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

- 整组复测语义　`{"intent":"search","target":{"category":"coffee_shop"},"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### D3　排名靠前的几家。

**① 用户要什么（验收标准）**

- 指令原话　排名靠前的几家。
- 首轮上下文　沿用 D2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 复测上下文　沿用 D2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　目标沿用咖啡店；排名依据不明时追问。保留咖啡店任务并询问排名依据。

**② 系统听懂了吗（中间结果）**

- 理解判断　两次都未取得可用的解析结果。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　未返回，无法判断模型原意。
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 关键事实　首轮字段校验报错，复测也返回 502。预期的排序追问没有返回。
- **逐项验收**　未通过；未得到追问
- **定位与编号**　解析／校验环节；模型原文缺失，待定位

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮接口返回 502，模型输出未通过字段校验，未展示预期追问。复测再次返回 502。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

- 整组复测语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

</details>

#### D4　按评分。

**① 用户要什么（验收标准）**

- 指令原话　按评分。
- 首轮上下文　沿用 D2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 复测上下文　沿用 D2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　排序按评分降序。按评分从高到低排列。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出按评分从高到低排列。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"},"preferences":[{"field":"rating","direction":"higher"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"},"preferences":[{"field":"rating","direction":"higher"}]}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　依次返回 4.2、4.6、4.4、4.7、4.6 分，排序未做到。D3 已中断，不能验证完整问答。
- **逐项验收**　评分偏好识别通过；排序未通过；完整澄清链未验证
- **定位与编号**　检索结果排序 B7

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮识别评分优先，但首项 4.2 分，后有 4.7 分，未按评分从高到低排列；前一步中断。

- 首轮语义　`{"intent":"search","target":{"category":"coffee_shop"},"preferences":[{"field":"rating","direction":"higher"}],"preference_order":["rating"],"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

- 整组复测语义　`{"intent":"search","target":{"category":"coffee_shop"},"preferences":[{"field":"rating","direction":"higher"}],"preference_order":["rating"],"dialogue":{"relation":"continue_task","rule_id":"T50"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

### E 组｜营业时间和类别

检查现在营业、指定时刻营业，以及切换或并选类别时是否保留时间条件。

#### E1　找静安寺附近现在还营业的咖啡店。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近现在还营业的咖啡店。
- 首轮上下文　新对话，无历史或候选
- 本轮验收　硬条件当前营业；静安寺咖啡店。只找当前营业的咖啡店。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出“现在营业”是条件。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_now","value":true}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回 5 家并提示附加条件未核验。无法从这次结果确认营业筛选生效。
- **逐项验收**　营业条件识别通过；实际核验证据不足
- **定位与编号**　检索条件核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

识别“现在营业”，检索明确提示未核验。

- 首轮语义　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_now","value":true}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### E2　我是晚上九点去，到时候还开着就行。

**① 用户要什么（验收标准）**

- 指令原话　我是晚上九点去，到时候还开着就行。
- 首轮上下文　沿用 E1 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　硬条件改为21:00营业。将营业判断时间改到21:00。

**② 系统听懂了吗（中间结果）**

- 理解判断　将判断时刻从现在改为 21:00。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　五家标注的营业时间均覆盖 21:00，样本中没有提前关门的店，无法判断是否做了过滤。
- **逐项验收**　时间替换通过；样本全部覆盖21:00，过滤证据不足
- **定位与编号**　检索条件核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

时间改为 21:00。候选营业时间均覆盖 21:00，此样本不能证明执行了时间过滤。

- 首轮语义　`{"intent":"modify_search","target":{"category":"coffee_shop"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；蜜雪冰城(静安寺店)（4.2分，13.00元，30米，09:00-24:00）、Peet's皮爷咖啡(愚园路店)（4.6分，39.00元，147米，07:30-22:00）、星巴克(1788广场店)（4.4分，30.00元，175米，06:30-22:00）、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)（4.7分，53.00元，439米，08:00-22:00）、看得到风景的咖啡馆(静安店)（4.6分，78.00元，104米，11:00-02:00）

</details>

#### E3　咖啡店或便利店都行。

**① 用户要什么（验收标准）**

- 指令原话　咖啡店或便利店都行。
- 首轮上下文　沿用 E2 的 frame，候选 5 家（按原顺序：蜜雪冰城(静安寺店)、Peet's皮爷咖啡(愚园路店)、星巴克(1788广场店)、Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)、看得到风景的咖啡馆(静安店)）
- 本轮验收　咖啡店或便利店；均需21:00营业。咖啡店或便利店均可，两类都要在21:00营业。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别咖啡店或便利店均可，并保留 21:00。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"any_of":[{"category":"coffee_shop"},{"category":"convenience_store"}]},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}]}`
- 首轮检索请求　线上实参未采集；本地同一 frame 回放未发起地图查询。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　0 家；请指定一种地点再搜索。
- 关键事实　回复“请指定一种地点再搜索。”，没有返回两类地点。
- **逐项验收**　语义通过；双类别检索未通过
- **定位与编号**　检索能力 B8

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

正确保留两种类别和时间；检索提示只支持指定一种地点。

- 首轮语义　`{"intent":"modify_search","target":{"any_of":[{"category":"coffee_shop"},{"category":"convenience_store"}]},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　请指定一种地点再搜索。；

</details>

#### E4　那就只看便利店。

**① 用户要什么（验收标准）**

- 指令原话　那就只看便利店。
- 首轮上下文　沿用 E3 的 frame，候选 0 家
- 本轮验收　仅便利店；仍需21:00营业。只看便利店，保留21:00营业要求。

**② 系统听懂了吗（中间结果）**

- 理解判断　目标收窄为便利店，仍要求 21:00 营业。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"convenience_store"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=便利店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　恢复搜索，返回 5 家便利店候选。营业条件仍提示未核验。
- **逐项验收**　类别收窄通过；时间核验证据不足
- **定位与编号**　检索条件核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

正确收窄到便利店，保留 21:00 并恢复搜索；营业条件仍未核验。

- 首轮语义　`{"intent":"modify_search","target":{"category":"convenience_store"},"scope":{"type":"area","area":"静安寺"},"constraints":[{"field":"open_at","op":"eq","value":"21:00","unit":"time","raw":"晚上九点"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；7-ELEVEn(静安寺店)（4.2分，53米，07:00-22:00）、么凤士多(上海久光百货店)（3.8分，107米，10:00-22:00）、全家便利店(愚园店)（4.2分，179米，24小时营业）、全家便利店（4.3分，204米，24小时营业）、全家便利店(万航渡路八店)（4.1分，220米，06:00-22:00）

</details>

### F 组｜换任务与重置

检查换任务时是否清除旧条件，重置后是否还会引用旧候选。

#### F1　找静安寺附近的餐厅，必须能停车。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近的餐厅，必须能停车。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　硬条件停车；静安寺餐厅。建立静安寺餐厅搜索，必须能停车。

**② 系统听懂了吗（中间结果）**

- 理解判断　首轮超时；复测正确识别静安寺餐厅、必须停车。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"parking","op":"eq","value":true}]}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　复测返回 5 家，停车未核验；本组的前置搜索已建立。
- **逐项验收**　首轮超时；复测建立任务通过；停车核验证据不足
- **定位与编号**　首轮超时原因待定位；检索核验 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮解析超时，未建立旧任务。复测成功建立停车硬条件。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "The operation was aborted due to timeout" }

- 整组复测语义　`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"parking","op":"eq","value":true}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### F2　还是南京东路附近的咖啡店吧。

**① 用户要什么（验收标准）**

- 指令原话　还是南京东路附近的咖啡店吧。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　沿用 F1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　新任务南京东路咖啡店；清旧停车要求。按当前规则建立南京东路咖啡店新任务，清除旧停车条件。

**② 系统听懂了吗（中间结果）**

- 理解判断　首轮失败；复测按新任务处理，清除了旧停车条件。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"area":"南京东路","type":"nearby"}}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=南京东路 → around keywords=咖啡店，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　5 家；上海 · 南京东路周边 3 公里 · 高德综合排序
- 关键事实　复测返回南京东路周边咖啡店候选。换区域、换类别、清旧条件符合预期。
- **逐项验收**　首轮失败；复测清旧条件通过
- **定位与编号**　首轮解析／校验待定位；复测未复现

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮请求失败，无法依据首轮判断是否清理旧条件。复测正确更换地点和类别，并清除旧停车要求。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

- 整组复测语义　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"area":"南京东路","type":"nearby"},"dialogue":{"relation":"new_task","rule_id":"T30"},"ready":true}`
- 检索　上海 · 南京东路周边 3 公里 · 高德综合排序；维克多咖啡厅 Victor's Café（4.1分，168.00元，71米，10:00-21:00）、星巴克(外滩店)（4.5分，30.00元，234米，07:00-24:00）、蜜雪冰城(南京东路店)（4.6分，9.00元，391米，09:00-24:00）、Peet's皮爷咖啡(外滩中央广场店)（4.4分，39.00元，118米，07:00-22:00）、Costa Coffee(上海外滩店)（4.4分，40.00元，244米，08:00-24:00）

</details>

#### F3　重新开始对话。

**① 用户要什么（验收标准）**

- 指令原话　重新开始对话。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　沿用 F2 的 frame，候选 5 家（按原顺序：维克多咖啡厅 Victor's Café、星巴克(外滩店)、蜜雪冰城(南京东路店)、Peet's皮爷咖啡(外滩中央广场店)、Costa Coffee(上海外滩店)）
- 本轮验收　清空任务和候选。清除上一轮任务和候选。

**② 系统听懂了吗（中间结果）**

- 理解判断　两次均识别为重置会话。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"reset_session"}`
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"reset_session"}`
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　返回 reset_session，无需地点列表
- 复测应用返回　返回 reset_session，无需地点列表
- 关键事实　复测在已有候选时返回重置；随后 F4 未绑定旧店，符合预期。
- **逐项验收**　重置指令通过；复测后续引用行为通过
- **定位与编号**　无

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

成功返回重置指令；首轮旧任务未成功建立。复测成功清空有候选的任务。

- 首轮语义　`{"intent":"reset_session","ready":false,"dialogue":{"relation":"reset","rule_id":"T10"}}`

- 整组复测语义　`{"intent":"reset_session","ready":false,"dialogue":{"relation":"reset","rule_id":"T10"}}`

</details>

#### F4　就第二家。

**① 用户要什么（验收标准）**

- 指令原话　就第二家。
- 首轮上下文　沿用 F3 的 frame，候选 0 家
- 复测上下文　沿用 F3 的 frame，候选 0 家
- 本轮验收　候选已清空，要求澄清。重置后没有第二家可选，应追问店名。

**② 系统听懂了吗（中间结果）**

- 理解判断　首轮解析失败；复测识别出没有可用的第二家。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","follow_up":"当前没有展示候选列表，请告诉我您指的是哪一家？"}`
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　当前没有展示候选列表，请告诉我您指的是哪一家？
- 关键事实　复测追问“当前没有展示候选列表，请告诉我您指的是哪一家？”。复测符合预期，两次表现不同。
- **逐项验收**　首轮未通过；复测澄清通过
- **定位与编号**　首轮解析／校验待定位

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮缺少列表时返回字段校验错误，没有完成澄清。复测正确追问，结果有波动。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

- 整组复测语义　`{"intent":"clarify","follow_up":"当前没有展示候选列表，请告诉我您指的是哪一家？","ambiguity":{"type":"candidate_reference_unavailable","field":"candidate_selection","raw":"就第二家","alternatives":["用户试图选择列表中的第二项，但当前无有效列表"]},"dialogue":{"relation":"continue_task","rule_id":"T70","active_task":{"intent":"clarify","ambiguity":{"type":"candidate_reference_unavailable","field":"candidate_selection","raw":"就第二家","alternatives":["用户试图选择列表中的第二项，但当前无有效列表"]}}},"ready":false}`

</details>

### G 组｜选择一家店

检查“第二家”是否对应上一轮的店，以及“它几点关门”是否指向同一家。

#### G1　找静安寺附近的咖啡店，给我三家。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近的咖啡店，给我三家。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　静安寺咖啡店；数量三家。展示三家咖啡店，供下一轮选择。

**② 系统听懂了吗（中间结果）**

- 理解判断　两次都未取得可用解析。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　未返回，无法判断模型原意。
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 关键事实　两次均返回 502，没有生成三家候选。
- **逐项验收**　两次未生成列表
- **定位与编号**　解析／校验环节待定位

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮请求失败，未取得三家候选。复测仍为 502。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

- 整组复测语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

</details>

#### G2　看看第二家。

**① 用户要什么（验收标准）**

- 指令原话　看看第二家。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　引用上轮第二家。打开上轮列表中的第二家。

**② 系统听懂了吗（中间结果）**

- 理解判断　两次请求失败，且上一轮没有有效列表。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　未返回，无法判断模型原意。
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 复测应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 关键事实　没有返回第二家的详情；无法验证选店是否准确。
- **逐项验收**　前置列表未建立；请求失败，选店能力未验证
- **定位与编号**　前置 G1 阻塞；本轮失败原因待定位

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮请求失败，前置列表也未建立。复测仍为 502。

- 首轮语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "The operation was aborted due to timeout" }

- 整组复测语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "\u6A21\u578B\u8F93\u51FA\u65E0\u6548\uFF1A\u8BED\u4E49 JSON \u672A\u901A\u8FC7\u5B57\u6BB5\u6821\u9A8C" }

</details>

#### G3　它几点关门？

**① 用户要什么（验收标准）**

- 指令原话　它几点关门？
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　查询已选店的关门时间。回答刚选的店几点关门。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出“它”缺少可用的指代对象。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","target":{"reference":{"label":"it"}},"missing":["candidate_id"],"follow_up":"请问您指的是哪一家店？"}`
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","missing":["candidate"],"follow_up":"请问您想查询哪家店的关门时间？"}`
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　请问您指的是哪一家店？
- 复测应用返回　请问您想查询哪家店的关门时间？
- 关键事实　追问指哪一家，未返回关门时间。无候选时追问合理，沿用已选店的能力仍未验证。
- **逐项验收**　缺候选时追问通过；原目标未验证
- **定位与编号**　前置 G1/G2 阻塞

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮缺少候选时正确追问店名；能否沿用已选店需要有效前置列表。复测也缺少列表，此轮持续追问店名。

- 首轮语义　`{"intent":"clarify","target":{"reference":{"label":"it"}},"missing":["candidate_id"],"ambiguity":{"type":"missing_reference","field":"candidate_id","raw":"它","alternatives":["需要指定具体的候选对象"]},"dialogue":{"relation":"continue_task","rule_id":"T60","active_task":{"intent":"clarify","target":{"reference":{"label":"it"}},"missing":["candidate_id"],"ambiguity":{"type":"missing_reference","field":"candidate_id","raw":"它","alternatives":["需要指定具体的候选对象"]}}},"follow_up":"请问您指的是哪一家店？","ready":false}`

- 整组复测语义　`{"intent":"clarify","ambiguity":{"type":"missing_reference","field":"candidate","raw":"它","alternatives":[]},"missing":["candidate"],"dialogue":{"relation":"new_task","rule_id":"T40","active_task":{"intent":"clarify","ambiguity":{"type":"missing_reference","field":"candidate","raw":"它","alternatives":[]},"missing":["candidate"]}},"follow_up":"请问您想查询哪家店的关门时间？","ready":false}`

</details>

### H 组｜条件冲突与路线

检查预算冲突和改口，以及从沿途搜索切换到附近搜索后的条件变化。

#### H1　找人均至少100元、最多80元的餐厅。

**① 用户要什么（验收标准）**

- 指令原话　找人均至少100元、最多80元的餐厅。
- 首轮上下文　新对话，无历史或候选
- 本轮验收　下限100元与上限80元冲突时澄清。发现上下限冲突并追问。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出至少 100 元与最多 80 元互相冲突。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"clarify","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"gte","value":100,"unit":"CNY","raw":"至少100元"},{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"最多80元"}],"follow_up":"人均预算是100元以上，还是80元以内？"}`
- 首轮检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　人均预算是100元以上，还是80元以内？
- 关键事实　回复“人均预算是100元以上，还是80元以内？”。按预期追问。
- **逐项验收**　识别冲突和追问通过
- **定位与编号**　无

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

正确识别矛盾，并追问预算。

- 首轮语义　`{"intent":"clarify","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"gte","value":100,"unit":"CNY","raw":"至少100元"},{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"最多80元"}],"ambiguity":{"type":"conflict","field":"price_per_person","raw":"人均至少100元、最多80元"},"dialogue":{"relation":"new_task","rule_id":"T40","active_task":{"intent":"clarify","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"gte","value":100,"unit":"CNY","raw":"至少100元"},{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"最多80元"}],"ambiguity":{"type":"conflict","field":"price_per_person","raw":"人均至少100元、最多80元"}}},"follow_up":"人均预算是100元以上，还是80元以内？","ready":false}`

</details>

#### H2　刚才说错了，最多180元。

**① 用户要什么（验收标准）**

- 指令原话　刚才说错了，最多180元。
- 首轮上下文　沿用 H1 的 frame，候选 0 家；待答问题「人均预算是100元以上，还是80元以内？」
- 本轮验收　硬条件100至180元；仅替换上限。只把上限改为180元，保留下限100元。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出新上限 180 元，但丢了原下限 100 元。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"lte","value":180,"unit":"CNY","raw":"最多180元"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回了 85、93、65 元等低于下限的餐厅。只改上限的要求没有做到。
- **逐项验收**　新上限通过；旧下限丢失，未通过
- **定位与编号**　首次偏差见校验后语义 B6；模型或后处理待区分

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

只改上限后，下限 100 元也丢失；检索含 65、85、93 元候选。

- 首轮语义　`{"dialogue":{"relation":"continue_task","rule_id":"T50"},"intent":"search","target":{"category":"restaurant"},"constraints":[{"field":"price_per_person","op":"lte","value":180,"unit":"CNY","raw":"最多180元"}],"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### H3　沿途找个充电站，最多绕十分钟，最好有洗手间。

**① 用户要什么（验收标准）**

- 指令原话　沿途找个充电站，最多绕十分钟，最好有洗手间。
- 首轮上下文　沿用 H2 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　范围沿途；硬条件绕行≤10分钟；偏好洗手间。沿途找充电站，绕行不超过十分钟，最好有洗手间；缺少路线时说明限制。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别沿途充电站、绕行最多 10 分钟，并把洗手间记为偏好。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"charger"},"scope":{"type":"along_route"},"constraints":[{"field":"detour_time","op":"lte","value":10,"unit":"min"}],"preferences":[{"field":"restroom","value":true}]}`
- 首轮检索请求　线上实参未采集；本地同一 frame 回放未发起地图查询。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　0 家；首页处于非导航态，请指定附近的地点。
- 关键事实　回复“首页处于非导航态，请指定附近的地点。”，如实说明了路线限制。
- **逐项验收**　语义通过；非导航态说明限制通过
- **定位与编号**　无

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

正确区分绕行上限与设施偏好，并提示首页无法沿途检索。

- 首轮语义　`{"dialogue":{"relation":"new_task","rule_id":"T30"},"intent":"search","target":{"category":"charger"},"scope":{"type":"along_route"},"constraints":[{"field":"detour_time","op":"lte","value":10,"unit":"min"}],"preferences":[{"field":"restroom","value":true}],"ready":true}`
- 检索　首页处于非导航态，请指定附近的地点。；

</details>

#### H4　那就找静安寺附近的充电站，最好有洗手间。

**① 用户要什么（验收标准）**

- 指令原话　那就找静安寺附近的充电站，最好有洗手间。
- 首轮上下文　沿用 H3 的 frame，候选 0 家
- 本轮验收　范围改静安寺附近；保留洗手间偏好；删除绕行上限。改查静安寺附近的充电站，保留洗手间偏好，清除绕行限制。

**② 系统听懂了吗（中间结果）**

- 理解判断　改成静安寺附近的充电站，保留洗手间偏好，删除绕行限制。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"charger"},"scope":{"type":"area","area":"静安寺"},"preferences":[{"field":"restroom","value":true}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=充电站，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　恢复搜索，返回 5 个充电站。任务切换成功，洗手间情况仍未核验。
- **逐项验收**　切换任务及恢复检索通过；设施偏好效果未验证
- **定位与编号**　检索偏好证据不足，暂不定 bug

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

成功切换到附近，保留洗手间偏好，清掉绕行时间，返回充电站；设施未核验。

- 首轮语义　`{"intent":"search","target":{"category":"charger"},"scope":{"type":"area","area":"静安寺"},"preferences":[{"field":"restroom","value":true}],"dialogue":{"relation":"new_task","rule_id":"T30"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；逸安启超级充电站(上海静安CP)（3.6分，181米，24小时营业）、依威能源汽车充电站(金航大厦)（2.1分，191米，24小时营业）、蔚来能源汽车充电站(上海1788广场)（3.8分，196米，24小时营业）、特斯拉超级充电站(上海-越洋广场)（3.8分，205米，24小时营业）、国家电网汽车充电站(上海静安区会德丰电动汽车充电站)（3.5分，211米，24小时营业）

</details>

## 下一条（复制使用）

用例编号＿＿　日期／版本＿＿　测试入口（本地、线上接口或网页）＿＿

### ① 用户要什么（验收标准）

- 指令原话＿＿；影响本轮判断的上下文（上一轮 frame、候选列表或待回答的问题）＿＿
- 本条验收标准：硬条件＿＿；偏好＿＿；范围＿＿；排序＿＿。只填相关项。

### ② 系统听懂了吗（中间结果）

- 理解结论（一句话）＿＿
- 模型原始 JSON 的相关字段＿＿ → 校验后 frame 的相关字段＿＿
- 条件有没有用于执行？实际检索请求中的关键词、城市、地标、半径、排序等相关参数＿＿；需要在结果返回后过滤的条件＿＿

### ③ 实际返回了什么、做到了吗（事实与差距）

- 高德原始响应：候选数量及相关字段＿＿
- 应用最终返回：候选、顺序、关键数值或追问／错误原话＿＿
- 对照①逐项判断：通过／未通过／证据不足，依据＿＿
- 有差距时：第一处有证据的偏差＿＿；归属（语义／程序／检索／外部数据／待定位）＿＿；关联 bug 编号（已建时）＿＿；下一步＿＿

未取得的证据写“未采集”；该轮无需检索时写“不适用”。正文摘录关键字段，完整 JSON 可折叠保存。

## 第二轮测试｜2026-11-17｜A 组静安寺咖啡厅范围测试

第一轮为前文 A–H 组原始用例；第二轮增加静安寺咖啡厅 200／300／500 米三个 case。同一组 case 重跑记为复测，不另增测试轮次。100 米尚未测试。

### 首次执行

#### R2-01｜200 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近200米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤200米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 502。未取得 frame，错误原话：The operation was aborted due to timeout。
- 补测方式　手动构造 coffee_shop、静安寺、distance lte 200 m 条件调用 /search；这一步仅验证检索，不能当作模型解析通过。
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 单独检索补测返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在200米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 否 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　解析超时，完整流程未完成；距离范围未通过，Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)439米超出200米上限；摘要未按200米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result-round1.json、eval-a-radius-online-search-200.json。

#### R2-02｜300 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近300米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤300米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 200。类别、地标和距离上限识别正确。
- 校验后 frame　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":300,"unit":"m"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 完整流程返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在300米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 否 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　语义通过；距离范围未通过，Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)439米超出300米上限；摘要未按300米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result-round1.json。

#### R2-03｜500 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近500米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤500米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 502。未取得 frame，错误原话：The operation was aborted due to timeout。
- 补测方式　手动构造 coffee_shop、静安寺、distance lte 500 m 条件调用 /search；这一步仅验证检索，不能当作模型解析通过。
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 单独检索补测返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在500米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 是 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　解析超时，完整流程未完成；样本内未见越界，但缺少越界反例及线上请求参数，距离筛选是否执行证据不足；摘要未按500米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result-round1.json、eval-a-radius-online-search-500.json。

### 第一次复测

#### R2-01｜200 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近200米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤200米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 200。类别、地标和距离上限识别正确。
- 校验后 frame　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":200,"unit":"m","raw":"200米以内"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 完整流程返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在200米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 否 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　语义通过；距离范围未通过，Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)439米超出200米上限；摘要未按200米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result.json。

#### R2-02｜300 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近300米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤300米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 200。类别、地标和距离上限识别正确。
- 校验后 frame　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺"},"constraints":[{"field":"distance","op":"lte","value":300,"unit":"m","raw":"300米以内"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 完整流程返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在300米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 否 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　语义通过；距离范围未通过，Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店)439米超出300米上限；摘要未按300米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result.json。

#### R2-03｜500 米

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近500米以内的咖啡厅。
- 上下文　独立新对话，不传上一轮 frame 或候选；测试城市上海，地标静安寺。
- 验收标准　静安寺附近的咖啡厅，距离硬上限≤500米；未指定偏好和排序。

**② 系统听懂了吗（中间结果）**

- 模型原始 JSON　未采集。
- 线上 /parse　HTTP 200。类别、地标和距离上限识别正确。
- 校验后 frame　`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"within"},"constraints":[{"field":"distance","op":"lte","value":500,"unit":"m"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 条件有没有用于执行　线上发给高德的内部请求未采集，实际 radius 未取得；当前本地代码固定为3000米。返回距离与摘要的对照见③。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集，以下为应用接口返回。
- 完整流程返回　5家，原顺序如下。

| 顺序 | 地点 | 距离 | 是否在500米内 |
|---|---|---:|---|
| 1 | 蜜雪冰城(静安寺店) | 30米 | 是 |
| 2 | Peet's皮爷咖啡(愚园路店) | 147米 | 是 |
| 3 | 星巴克(1788广场店) | 175米 | 是 |
| 4 | Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) | 439米 | 是 |
| 5 | 看得到风景的咖啡馆(静安店) | 104米 | 是 |

- 应用摘要　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 逐项验收　语义通过；样本内未见越界，但缺少越界反例及线上请求参数，距离筛选是否执行证据不足；摘要未按500米更新。
- 类别核对　首项蜜雪冰城的返回类别是“冷饮店”，咖啡厅类别精度未完全通过；具体归因待查检索参数及外部分类。
- 定位与下一步　距离问题关联 B3（检索参数映射）；核对距离条件是否传入查询、结果是否按上限过滤，并更新范围摘要后复测。
- 完整证据　eval-a-radius-online-result.json。


## 2026-11-17｜文件分类与距离修复（本地验证）

**① 用户要什么（验收标准）**

- 将运行代码、规则、前端、测试和日志分文件夹；Codex 与豆包的评测及日志分开，已有原始记录保留。
- 修复距离上限未参与检索的问题：200／300／500米应传入对应半径，越界候选不展示，摘要随范围变化。

**② 系统听懂了吗（中间结果）**

- 本次为文件整理和本地程序验证，未调用模型，模型原始JSON与线上frame不适用。
- 当前文件位置及入口见根目录 README.md 的“文件分类导航”。历史记录中的旧路径保留当时原文，以README当前导航为准。
- src/home-search.mjs 已读取顶层 distance 的 lte／lt 条件，m／km换算成米；筛除超出硬上限或缺少距离数据的候选，重新编号，同步范围摘要。没有距离上限时仍使用默认3000米。
- 复合、模糊及其他距离运算不属于本次接入范围；其他条件与偏好继续提示尚未核验。超过50公里或缺少中心时返回说明。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 17项离线测试全部通过，包括移动后的语义回归，以及距离实参、单位换算、默认值、严格边界、越界与未知距离过滤、更换中心、编号和摘要。
- 模拟数据含0、100、200、300、439、500、501米及无效距离；200米留下0／100／200，300米再包含300，500米再包含439／500。此处为构造数据，不是真实店铺。
- 本机服务启动及首页访问HTTP 200，评测脚本语法检查通过。
- 未部署，线上此前结果仍属于修复前证据；真实高德数据下的修后表现待部署后验证。


## 第二轮测试｜第二次复测｜2026-11-17｜本地修复回放与线上对照

本地回放使用上次线上保存的候选重建地图响应；未访问真实高德，地标坐标为测试值，不能当作修后实时查店。线上是本次真实 /parse 请求。

### R2-01｜200米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近200米以内的咖啡厅。
- 独立输入，无历史；上海静安寺咖啡厅，硬距离≤200米；未指定排序。

**② 系统听懂了吗（中间结果）**

- 线上HTTP 200；本次接口未返回模型原始JSON，已保存校验后frame：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":200,"unit":"m"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本地回放复用历史frame，未调用模型；实际生成的周边请求radius=200米。线上发给高德的内部参数仍未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 本地修复回放：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；看得到风景的咖啡馆(静安店) 104米。
- 本地摘要：上海 · 静安寺周边 200 米 · 高德综合排序。半径参数、越界过滤与摘要检查通过。
- 本次线上：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 线上摘要：上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验。
- 线上验收：未通过，仍包含439米越界候选。类别仍含冷饮店，不计作类别修复。
- 下一步：部署本地修复后再进行真实高德检索验收；本次未部署。

### R2-02｜300米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近300米以内的咖啡厅。
- 独立输入，无历史；上海静安寺咖啡厅，硬距离≤300米；未指定排序。

**② 系统听懂了吗（中间结果）**

- 线上HTTP 200；本次接口未返回模型原始JSON，已保存校验后frame：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":300,"unit":"m","raw":"300米以内"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本地回放复用历史frame，未调用模型；实际生成的周边请求radius=300米。线上发给高德的内部参数仍未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 本地修复回放：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；看得到风景的咖啡馆(静安店) 104米。
- 本地摘要：上海 · 静安寺周边 300 米 · 高德综合排序。半径参数、越界过滤与摘要检查通过。
- 本次线上：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 线上摘要：上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验。
- 线上验收：未通过，仍包含439米越界候选。类别仍含冷饮店，不计作类别修复。
- 下一步：部署本地修复后再进行真实高德检索验收；本次未部署。

### R2-03｜500米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近500米以内的咖啡厅。
- 独立输入，无历史；上海静安寺咖啡厅，硬距离≤500米；未指定排序。

**② 系统听懂了吗（中间结果）**

- 线上HTTP 200；本次接口未返回模型原始JSON，已保存校验后frame：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"within"},"constraints":[{"field":"distance","op":"lte","value":500,"unit":"m","raw":"500米以内"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本地回放复用历史frame，未调用模型；实际生成的周边请求radius=500米。线上发给高德的内部参数仍未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 本地修复回放：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 本地摘要：上海 · 静安寺周边 500 米 · 高德综合排序。半径参数、越界过滤与摘要检查通过。
- 本次线上：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 线上摘要：上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验。
- 线上验收：样本内无越界，但摘要仍为3公里，范围执行证据不足。类别仍含冷饮店，不计作类别修复。
- 下一步：部署本地修复后再进行真实高德检索验收；本次未部署。

证据：tests/codex/results/eval-a-radius-online-2026-11-17T09-10-00-972Z.json；tests/codex/results/eval-a-radius-replay-result.json。


## 第二轮测试｜第三次复测｜2026-11-17｜用户更新部署后线上验收

入口：https://poi-semantic-agent.onrender.com。三个case分别独立请求，不传历史。

### R2-01｜200米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近200米以内的咖啡厅。；城市上海、地标静安寺。
- 类别咖啡厅，距离硬上限≤200米，摘要显示对应范围，结果不得越界；未指定排序。

**② 系统听懂了吗（中间结果）**

- /parse HTTP 200。距离、类别、地标识别正确。
- 本次接口未返回模型原始JSON；已保存校验后frame：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"within"},"constraints":[{"field":"distance","op":"lte","value":200,"unit":"m","raw":"200米以内"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 线上发给高德的内部请求参数未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 完整流程返回（原顺序）：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；看得到风景的咖啡馆(静安店) 104米；M Stand(上海静安久光百货店) 97米。
- 摘要：上海 · 静安寺周边 200 米 · 高德综合排序。
- 验收：本次样本距离与摘要通过，439米蓝瓶不再返回，补入97米M Stand。
- 类别仍含蜜雪冰城（冷饮店），咖啡厅类别精度未完全通过。本次未采集高德原始响应，以上为应用返回。

### R2-02｜300米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近300米以内的咖啡厅。；城市上海、地标静安寺。
- 类别咖啡厅，距离硬上限≤300米，摘要显示对应范围，结果不得越界；未指定排序。

**② 系统听懂了吗（中间结果）**

- /parse HTTP 200。距离、类别、地标识别正确。
- 本次接口未返回模型原始JSON；已保存校验后frame：`{"intent":"search","target":{"category":"coffee_shop"},"scope":{"type":"nearby","area":"静安寺","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":300,"unit":"m"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 线上发给高德的内部请求参数未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 完整流程返回（原顺序）：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；看得到风景的咖啡馆(静安店) 104米；M Stand(上海静安久光百货店) 97米。
- 摘要：上海 · 静安寺周边 300 米 · 高德综合排序。
- 验收：本次样本距离与摘要通过，439米蓝瓶不再返回，补入97米M Stand。
- 类别仍含蜜雪冰城（冷饮店），咖啡厅类别精度未完全通过。本次未采集高德原始响应，以上为应用返回。

### R2-03｜500米

**① 用户要什么（验收标准）**

- 原话：找静安寺附近500米以内的咖啡厅。；城市上海、地标静安寺。
- 类别咖啡厅，距离硬上限≤500米，摘要显示对应范围，结果不得越界；未指定排序。

**② 系统听懂了吗（中间结果）**

- /parse HTTP 502。首次与单独重试均502，错误为“模型输出无效：语义 JSON 未通过字段校验”，未取得frame。
- 本次接口未返回模型原始JSON；无法判断模型具体输出了哪个非法字段；不能用手工frame冒充模型原始结果。
- 另外手动构造distance lte 500 m的frame调用/search，单独验证检索，HTTP 200。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 单独检索补测返回（原顺序）：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 摘要：上海 · 静安寺周边 500 米 · 高德综合排序。
- 验收：500米检索样本距离与摘要通过，但完整语义流程未通过，连续两次校验错误需另查。
- 类别仍含蜜雪冰城（冷饮店），咖啡厅类别精度未完全通过。本次未采集高德原始响应，以上为应用返回。

证据：tests/codex/results/eval-a-radius-online-2026-11-17T09-15-31-260Z.json；tests/codex/results/eval-a-radius-online-500-retry-2026-11-17T09-16-18-112Z.json；tests/codex/results/eval-a-radius-search-500-deployed-2026-11-17T09-16-45-699Z.json。

## 第二轮测试｜500米校验失败排查与本地修复｜2026-11-17

**① 用户要什么（验收标准）**

- 找静安寺附近500米以内的咖啡厅。定位连续502的原因；距离要求应保留，模型原始输出与校验后结果分别留存。
- 本次诊断只调用模型，不调用高德，不作为新一次真实查店验收。

**② 系统听懂了吗（中间结果）**

- 本地直接调用已配置的 Qwen/Qwen3.5-35B-A3B，保留每次原始回答、重试回答、最终frame或错误。修前4次调用中3次通过，1次复现与线上同文案的字段校验失败；该失败调用的两次模型生成均错误。
- 失败原始输出包含：`"scope":{"type":"nearby","area":"静安寺","distance":500,"unit":"m"}`，没有constraints。咖啡厅、地标、500米数值都识别到了，但距离写入不允许的字段。
- 原校验只回复“语义 JSON 未通过字段校验”，重试没有指出具体字段；模型第二次仍输出相同非法scope。证据：tests/codex/results/diagnose-500-2026-11-17T09-19-01-586Z.json，包含两次rawAnswer。
- 修复 src/agent.mjs：提示词明确禁止scope.distance／scope.radius／scope.unit，距离使用constraints条件；校验指出非法字段及允许字段，并要求改写距离且不可丢失要求。保持严格拒绝未知字段，不删除距离以求通过。
- 新增回归测试：复现错误scope，验证重试提示准确指出scope.distance／scope.unit，修正后500米条件仍完整保留。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 本地18项离线测试全部通过。
- 修后真实模型连续3次成功，均将distance lte 500 m放入constraints，生成合法frame；每次原始JSON已保存：tests/codex/results/diagnose-500-2026-11-17T09-20-04-613Z.json、diagnose-500-2026-11-17T09-20-08-513Z.json、diagnose-500-2026-11-17T09-20-12-195Z.json。
- 线上先前失败调用没有返回原始JSON，因此不能断言线上那两次必然是相同非法字段。本次确认的是本地可复现的同类原因，修后小样本通过，不保证模型永不出错。
- 当前修改尚未部署。本次运行代码变化仅为src/agent.mjs；上传后需要Render更新，再测线上500米。


## 第二轮测试｜第四次复测｜2026-11-17｜解析修复更新部署后

用户表示已更新，实测线上接口；未读取部署记录，不能仅凭本次成功结果证明具体提交版本。

### R2-01｜200米

**① 用户要什么（验收标准）**

- 指令：找静安寺附近200米以内的咖啡厅。新对话，城市上海，无历史及候选。
- 距离≤200米，摘要对应范围；完整解析与检索成功。

**② 系统听懂了吗（中间结果）**

- 本次接口未返回模型原始JSON，成功请求的校验后frame保存在证据文件中。
- 第1次：HTTP 502；Unexpected token '<', "<!DOCTYPE "... is not valid JSON；未取得frame。
- 第2次：HTTP 502；模型输出无效：语义 JSON 未通过字段校验；未取得frame。
- 线上内部模型原始响应、高德请求参数与高德原始响应未采集。200米首次非JSON响应的HTML正文未保存，无法判断生成它的是服务还是上游网关。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 两次均未得到店铺结果，200米本次完整流程未通过；第一次为502非JSON响应，第二次为模型字段校验错误，原因不可混同。下一步需捕获200米非法模型字段，排查剩余结构不稳定问题。
- 类别精度仍未修复，成功结果包含蜜雪冰城（冷饮店）；不算类别完全通过。

### R2-02｜300米

**① 用户要什么（验收标准）**

- 指令：找静安寺附近300米以内的咖啡厅。新对话，城市上海，无历史及候选。
- 距离≤300米，摘要对应范围；完整解析与检索成功。

**② 系统听懂了吗（中间结果）**

- 本次接口未返回模型原始JSON，成功请求的校验后frame保存在证据文件中。
- 第1次：HTTP 200；正确识别distance lte 300 m。
- 线上内部模型原始响应、高德请求参数与高德原始响应未采集。200米首次非JSON响应的HTML正文未保存，无法判断生成它的是服务还是上游网关。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 成功样本返回（原顺序）：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；看得到风景的咖啡馆(静安店) 104米；M Stand(上海静安久光百货店) 97米。
- 摘要：上海 · 静安寺周边 300 米 · 高德综合排序。
- 距离和摘要：本次成功样本通过；500米共3次成功，300米1次成功。样本量有限，不代表永不失败。
- 类别精度仍未修复，成功结果包含蜜雪冰城（冷饮店）；不算类别完全通过。

### R2-03｜500米

**① 用户要什么（验收标准）**

- 指令：找静安寺附近500米以内的咖啡厅。新对话，城市上海，无历史及候选。
- 距离≤500米，摘要对应范围；完整解析与检索成功。

**② 系统听懂了吗（中间结果）**

- 本次接口未返回模型原始JSON，成功请求的校验后frame保存在证据文件中。
- 第1次：HTTP 200；正确识别distance lte 500 m。
- 第2次：HTTP 200；正确识别distance lte 500 m。
- 第3次：HTTP 200；正确识别distance lte 500 m。
- 线上内部模型原始响应、高德请求参数与高德原始响应未采集。200米首次非JSON响应的HTML正文未保存，无法判断生成它的是服务还是上游网关。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 成功样本返回（原顺序）：蜜雪冰城(静安寺店) 30米；Peet's皮爷咖啡(愚园路店) 147米；星巴克(1788广场店) 175米；Blue Bottle Coffee蓝瓶咖啡(静安嘉里中心店) 439米；看得到风景的咖啡馆(静安店) 104米。
- 摘要：上海 · 静安寺周边 500 米 · 高德综合排序。
- 距离和摘要：本次成功样本通过；500米共3次成功，300米1次成功。样本量有限，不代表永不失败。
- 类别精度仍未修复，成功结果包含蜜雪冰城（冷饮店）；不算类别完全通过。

本次完整证据：tests/codex/results/eval-a-radius-online-2026-11-17T09-22-53-588Z.json；tests/codex/results/eval-a-radius-online-followup-2026-11-17T09-23-31-486Z.json。


## 第三轮测试｜2026-11-17｜上海南京西路加油站1／2／5公里

三个case分别独立输入，不传历史或候选；测试城市上海。高德实际选择的地标是“南京西路(地铁站)”，不是整条南京西路或用户当前位置。未改动业务代码。

### R3-01｜1公里

**① 用户要什么（验收标准）**

- 原话：找南京西路附近1公里以内的加油站。
- 地点南京西路，类别加油站，硬距离≤1公里；未指定排序。结果不越界，摘要显示对应范围。

**② 系统听懂了吗（中间结果）**

- 首次HTTP 200：类别gas、地点和距离条件正确。。
- 成功请求校验后frame：`{"intent":"search","target":{"category":"gas"},"scope":{"type":"area","area":"南京西路","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":1,"unit":"km"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本次接口未返回模型原始JSON；线上提交高德的内部请求参数、高德原始响应未采集，无法定位失败调用的具体非法字段。

**③ 实际返回了什么、做到了吗（事实与差距）**

| 顺序 | 地点 | 距离 | 是否在1公里内 |
|---|---|---:|---|
| 1 | 中国石化大田路加油站 | 594米 | 是 |
| 2 | 中国石化延安中路加油站 | 757米 | 是 |
| 3 | 中国石化成都路加油站 | 880米 | 是 |
| 4 | 中国石化长乐加油站 | 986米 | 是 |

- 应用摘要：上海 · 南京西路(地铁站)周边 1 公里 · 高德综合排序。
- 验收：成功样本类别、距离和摘要通过；首次完整流程成功。范围以南京西路地铁站为中心，地标选择是否符合用户预期需注意。
- 返回4家，不为凑数量放入1公里外候选。

### R3-02｜2公里

**① 用户要什么（验收标准）**

- 原话：找南京西路附近2公里以内的加油站。
- 地点南京西路，类别加油站，硬距离≤2公里；未指定排序。结果不越界，摘要显示对应范围。

**② 系统听懂了吗（中间结果）**

- 首次HTTP 502：模型输出无效：语义 JSON 未通过字段校验。
- 复测HTTP 200，解析成功；首次失败记录保留，不以复测覆盖。
- 成功请求校验后frame：`{"dialogue":{"relation":"new_task","rule_id":"T40"},"intent":"search","target":{"category":"gas"},"scope":{"type":"area","area":"南京西路","city_ref":"current_city"},"constraints":[{"field":"distance","op":"lte","value":2,"unit":"km"}],"ready":true}`。
- 本次接口未返回模型原始JSON；线上提交高德的内部请求参数、高德原始响应未采集，无法定位失败调用的具体非法字段。

**③ 实际返回了什么、做到了吗（事实与差距）**

| 顺序 | 地点 | 距离 | 是否在2公里内 |
|---|---|---:|---|
| 1 | 中国石化大田路加油站 | 594米 | 是 |
| 2 | 中国石化延安中路加油站 | 757米 | 是 |
| 3 | 中国石化成都路加油站 | 880米 | 是 |
| 4 | 中国石化长乐加油站 | 986米 | 是 |
| 5 | 中国石化第三加油站 | 1140米 | 是 |

- 应用摘要：上海 · 南京西路(地铁站)周边 2 公里 · 高德综合排序。
- 验收：成功样本类别、距离和摘要通过；首次解析失败、复测成功，稳定性未通过。范围以南京西路地铁站为中心，地标选择是否符合用户预期需注意。
- 接口默认只展示前5家；2公里和5公里列表相同不能证明半径没生效，更远候选未展示。

### R3-03｜5公里

**① 用户要什么（验收标准）**

- 原话：找南京西路附近5公里以内的加油站。
- 地点南京西路，类别加油站，硬距离≤5公里；未指定排序。结果不越界，摘要显示对应范围。

**② 系统听懂了吗（中间结果）**

- 首次HTTP 502：模型输出无效：语义 JSON 未通过字段校验。
- 复测HTTP 200，解析成功；首次失败记录保留，不以复测覆盖。
- 成功请求校验后frame：`{"intent":"search","target":{"category":"gas"},"scope":{"type":"area","area":"南京西路","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":5,"unit":"km"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本次接口未返回模型原始JSON；线上提交高德的内部请求参数、高德原始响应未采集，无法定位失败调用的具体非法字段。

**③ 实际返回了什么、做到了吗（事实与差距）**

| 顺序 | 地点 | 距离 | 是否在5公里内 |
|---|---|---:|---|
| 1 | 中国石化大田路加油站 | 594米 | 是 |
| 2 | 中国石化延安中路加油站 | 757米 | 是 |
| 3 | 中国石化成都路加油站 | 880米 | 是 |
| 4 | 中国石化长乐加油站 | 986米 | 是 |
| 5 | 中国石化第三加油站 | 1140米 | 是 |

- 应用摘要：上海 · 南京西路(地铁站)周边 5 公里 · 高德综合排序。
- 验收：成功样本类别、距离和摘要通过；首次解析失败、复测成功，稳定性未通过。范围以南京西路地铁站为中心，地标选择是否符合用户预期需注意。
- 接口默认只展示前5家；2公里和5公里列表相同不能证明半径没生效，更远候选未展示。

证据：tests/codex/results/eval-nanjing-west-gas-2026-11-17T09-30-22-205Z.json；tests/codex/results/eval-nanjing-west-gas-2026-11-17T09-31-18-495Z.json。


## 第三轮测试｜连续对话补测｜2026-11-17｜5公里收窄到500米

同一对话，第二步传入第一步实际frame和5家候选；城市上海。

### R3-04｜先查5公里

**① 用户要什么（验收标准）**

- 原话：找南京西路附近5公里以内的加油站。
- 首次输入，无历史，南京西路附近加油站≤5公里。

**② 系统听懂了吗（中间结果）**

- 首次HTTP 200，无重试。校验后frame：`{"intent":"search","target":{"category":"gas"},"scope":{"type":"area","area":"南京西路","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":5,"unit":"km"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`。
- 本次接口未返回模型原始JSON。正确识别gas、南京西路与5km硬上限。线上高德内部请求参数及原始响应未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 返回5家：中国石化大田路加油站 594米；中国石化延安中路加油站 757米；中国石化成都路加油站 880米；中国石化长乐加油站 986米；中国石化第三加油站 1140米。
- 摘要：上海 · 南京西路(地铁站)周边 5 公里 · 高德综合排序。
- 验收：本次样本通过。返回距离均在5公里内。

### R3-05｜再收窄500米

**① 用户要什么（验收标准）**

- 原话：只看500米以内的。
- 承接上一轮5公里查询，只将距离上限替换为500米，保留南京西路和加油站类别；不保留5公里旧上限，不展示500米外候选。

**② 系统听懂了吗（中间结果）**

- 首次HTTP 200，无重试。校验后frame：`{"intent":"modify_search","target":{"category":"gas"},"scope":{"type":"area","area":"南京西路","relation":"nearby"},"constraints":[{"field":"distance","op":"lte","value":500,"unit":"m","raw":"500米以内"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`。
- 本次接口未返回模型原始JSON。关系正确为continue_task，类别gas和地点南京西路保留，距离改为500m，旧5km条件已替换。线上高德内部请求参数及原始响应未采集。

**③ 实际返回了什么、做到了吗（事实与差距）**

- 返回0家：空列表。
- 摘要：上海 · 南京西路(地铁站)周边 500 米 · 未找到匹配地点。
- 验收：本次样本通过。之前5家最近594米，均超过500米，新结果未再展示这些候选。空列表表示本次查询未找到匹配地点，不证明现实中绝对没有加油站。

完整证据：tests/codex/results/eval-gas-narrow-2026-11-17T09-33-16-417Z.json。

### 2026-11-17｜B 组复测与原始输出采集状态

- 证据：`tests/codex/results/eval-b-diagnosis-2026-11-17T09-59-03-051Z.json`。线上 B1–B4 连续对话均返回 frame；本地以同一 frame 和固定地图响应回放，复现过滤和排序缺失。业务代码及规则尚未修改。
- B1：frame 正确记录人均≤80元，线上仍返回85、123、110、93元的超限候选。
- B2：frame 保留80元上限，增加 `preferences:[{"field":"price","direction":"lower"}]`；结果仍超预算且未按价格升序。
- B3：frame 替换为120元上限并保留低价偏好；123元候选仍被展示。
- B4：frame 删除预算及价格偏好，增加 `preferences:[{"field":"distance","direction":"lower"}]`；结果未按距离升序。
- 定位：当前证据指向 `src/home-search.mjs` 未执行价格过滤与偏好排序；本轮校验后语义符合预期，未发现必须修改 rules 的证据。不能据此保证模型所有输入均正确。
- **模型原始 JSON：尚未采集。** 线上接口返回的是校验后 frame，不能冒充模型原始输出。评测脚本已新增 `--raw` 模式，通过 fetcher 在校验前保存每次模型返回的原文 `rawAnswer`、模型名、状态与 finish_reason，包含字段校验重试。需本机已有模型配置文件路径后运行；不在日志中保存密钥。


### 2026-11-17｜B1–B4 原始模型 JSON 与 Render 真实检索复测

模型：Qwen/Qwen3.5-35B-A3B。本地读取 rules 与 src/agent.mjs，连续调用真实模型；直接保存校验前 message.content，四轮均 HTTP 200、finish_reason=stop，无重试。随后将同一 frame 发给 Render /search，使用服务器高德配置，四轮均 HTTP 200。两阶段并非 Render /parse 的同一次调用。

完整证据：`tests/codex/results/eval-b-render-search-2026-11-17T10-06-29-163Z.json`。包含原始模型文本、校验后 frame、本地固定地图响应回放、Render 搜索结果。Render 返回的是应用结果，未采集服务器到高德的原始请求和原始响应。

#### B1 找静安寺附近的餐厅，人均不超过80元。

模型原始 JSON（仅排版，内容未补写）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lte",
      "value": 80,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  }
}
```

校验后 frame：仅增加 `ready:true`，其余内容与原始 JSON 一致。

Render 实际价格（元）：[85,123,110,93,65]；实际距离（米）：[78,206,148,212,245]。

验收：语义通过；超预算 4 家。

#### B2 最好便宜点。

模型原始 JSON（仅排版，内容未补写）：

```json
{
  "intent": "modify_search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lte",
      "value": 80,
      "unit": "CNY"
    }
  ],
  "preferences": [
    {
      "field": "price",
      "direction": "lower"
    }
  ],
  "dialogue": {
    "relation": "continue_task",
    "rule_id": "T60"
  }
}
```

校验后 frame：仅增加 `ready:true`，其余内容与原始 JSON 一致。

Render 实际价格（元）：[85,123,110,93,65]；实际距离（米）：[78,206,148,212,245]。

验收：语义通过；超预算 4 家。价格未升序，低价偏好未执行。

#### B3 预算放宽到120元。

模型原始 JSON（仅排版，内容未补写）：

```json
{
  "intent": "modify_search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lte",
      "value": 120,
      "unit": "CNY",
      "raw": "120元"
    }
  ],
  "preferences": [
    {
      "field": "price",
      "direction": "lower"
    }
  ],
  "dialogue": {
    "relation": "continue_task",
    "rule_id": "T60"
  }
}
```

校验后 frame：仅增加 `ready:true`，其余内容与原始 JSON 一致。

Render 实际价格（元）：[85,123,110,93,65]；实际距离（米）：[78,206,148,212,245]。

验收：语义通过；超预算 1 家。价格未升序，低价偏好未执行。

#### B4 不用管价格了，找近一点的。

模型原始 JSON（仅排版，内容未补写）：

```json
{
  "intent": "modify_search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [],
  "preferences": [
    {
      "field": "distance",
      "direction": "lower"
    }
  ],
  "dialogue": {
    "relation": "continue_task",
    "rule_id": "T60"
  }
}
```

校验后 frame：仅增加 `ready:true`，其余内容与原始 JSON 一致。

Render 实际价格（元）：[85,123,110,93,65]；实际距离（米）：[78,206,148,212,245]。

验收：语义通过；距离未升序，近优先未执行。

**定位结论**：本轮 B1–B4 无需先改 rules。模型正确提取80元上限、保留低价偏好、替换120元上限、删除所有价格要求并改成距离偏好。`src/home-search.mjs` 仅执行距离上限过滤，其余条件只用于“尚未核验”文案；没有价格过滤、没有偏好排序，周边请求仍为 `sortrule:weight`。真实 Render 结果与本地固定响应回放均复现。当前仅完成定位与采集，未修复业务代码、未部署。


### 2026-11-17｜B 组更换为三个独立首轮 case（当前验收集）

用户指定以下三条替换当前 B 组验收。此前 B1–B4 连续追问仅保留为历史，不再作为本轮验收集。每条 previous=null、candidates=[]，不传递上一条 frame。模型 Qwen/Qwen3.5-35B-A3B；每条均单次返回 HTTP 200，finish_reason=stop。取得原始输出后将校验后 frame 发往 Render /search，三条均 HTTP 200。完整 JSON：`tests/codex/results/eval-b-independent-2026-11-17T10-18-10-492Z.json`。未修改业务代码或规则。

#### B1 静安寺人均200元以上餐厅

模型原始 JSON（message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "gte",
      "value": 200,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  }
}
```

校验后 frame：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "gte",
      "value": 200,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "ready": true
}
```

真实应用检索价格（元，按返回顺序）：[85,123,110,93,65]。

验收：语义识别 gte 200 正确；五家均低于200元。src/home-search.mjs 未执行价格下限过滤，本地固定响应回放亦复现。

#### B2 静安寺人均100元以下餐厅

模型原始 JSON（message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lt",
      "value": 100,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  }
}
```

校验后 frame：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lt",
      "value": 100,
      "unit": "CNY"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "ready": true
}
```

真实应用检索价格（元，按返回顺序）：[85,123,110,93,65]。

验收：按“以下包含本数”期望 lte 100，模型实际输出 lt 100，校验原样保留。现行 rules 未明确统一“以上/以下”边界，应补规则及边界样例，不能归因于 src 将 lte 改成 lt。真实结果110、123元越界，src 价格上限过滤也未执行。线上候选没有恰好100元，不能用线上列表验证等值边界。

#### B3 静安寺高档餐厅

模型原始 JSON（message.content 原文）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant",
    "raw": "高档餐厅"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "preferences": [
    {
      "field": "price_level",
      "direction": "higher",
      "raw": "高档"
    }
  ],
  "ambiguity": {
    "type": "ranking_basis",
    "field": "ranking_basis",
    "raw": "高档",
    "alternatives": [
      "价格",
      "评分",
      "人气"
    ]
  },
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "follow_up": "你更看重评分，还是人气？"
}
```

校验后 frame：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant",
    "raw": "高档餐厅"
  },
  "scope": {
    "type": "area",
    "area": "静安寺"
  },
  "preferences": [
    {
      "field": "price_level",
      "direction": "higher",
      "raw": "高档"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "ready": true
}
```

真实应用检索价格（元，按返回顺序）：[85,123,110,93,65]。

验收：模型保留“高档”，没有编造具体人均阈值；但原始 JSON 含 ranking_basis 歧义及无必要的“评分还是人气”反问。src/agent.mjs 的无排名触发词兜底删除 follow_up/ambiguity，最终 ready=true。原始语义并非完全通过。home-search 根据 category 生成“餐厅”关键词，未使用 target.raw=高档餐厅、未执行 price_level 偏好。真实候选与前两条相同，不能据此声称满足高档。应先定义高档语义及可执行策略，不能擅定200元等门槛。

**当前定位**：B1 主要在 src 检索过滤；B2 同时有边界规则不明确/模型边界偏差及 src 过滤缺失；B3 同时有模型多余反问及 src 未执行高档语义。此前“B组均无需改rules”的判断仅对应旧连续追问样本，不适用于新三条独立 case。


### 历史存档｜已被独立三条case替换的旧B组连续追问

以下保留当时记录，不属于当前B组验收集。

### B 组｜价格和距离

检查预算上限、低价偏好，以及取消预算后能否改按距离排序。

#### B1　找静安寺附近的餐厅，人均不超过80元。

**① 用户要什么（验收标准）**

- 指令原话　找静安寺附近的餐厅，人均不超过80元。
- 首轮上下文　新对话，无历史或候选
- 复测上下文　新对话，无历史或候选
- 本轮验收　硬条件人均≤80元；静安寺附近。静安寺附近餐厅，人均不超过80元，含80元。

**② 系统听懂了吗（中间结果）**

- 理解判断　识别出人均上限 80 元，包含 80 元。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"人均不超过80元"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"人均不超过80元"}]}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　五家分别为 **85、123、110、93、65 元**，只有最后一家符合。价格筛选未做到。
- **逐项验收**　上限识别通过；价格筛选未通过
- **定位与编号**　检索结果过滤 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

80 元上限识别正确，5 条中 4 条超限（85、123、110、93 元）。

- 首轮语义　`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"人均不超过80元"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

- 整组复测语义　`{"intent":"search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":80,"unit":"CNY","raw":"人均不超过80元"}],"dialogue":{"relation":"new_task","rule_id":"T40"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### B2　最好便宜点。

**① 用户要什么（验收标准）**

- 指令原话　最好便宜点。
- 首轮上下文　沿用 B1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 复测上下文　沿用 B1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　硬条件沿用80元；偏好低价。保留80元上限，同等条件下便宜的优先。

**② 系统听懂了吗（中间结果）**

- 理解判断　首轮连接中断，复测返回 502，两次均未取得解析结果。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　未返回，无法判断模型原意。
- 复测检索请求　未进入检索

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　不适用，本轮未执行检索。
- 首轮应用返回　The SSL connection could not be established, see inner exception.
- 复测应用返回　Response status code does not indicate success: 502 (Bad Gateway).
- 关键事实　没有取得按价格排序的候选，无法验证。
- **逐项验收**　解析未通过；低价排序证据不足
- **定位与编号**　首轮传输中断，复测解析失败；待定位

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮连接中断，未取得低价排序的首轮证据。复测返回 502，低价排序仍未验证。

- 首轮语义　未返回
- 请求错误　The SSL connection could not be established, see inner exception. Received an unexpected EOF or 0 bytes from the transport stream.

- 整组复测语义　未返回
- 请求错误　Response status code does not indicate success: 502 (Bad Gateway).  { "error": "The operation was aborted due to timeout" }

</details>

#### B3　预算放宽到120元。

**① 用户要什么（验收标准）**

- 指令原话　预算放宽到120元。
- 首轮上下文　沿用 B1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 复测上下文　沿用 B1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　硬条件改为≤120元。把原价格上限改成120元。

**② 系统听懂了吗（中间结果）**

- 理解判断　首轮连接中断；复测把上限正确改为 120 元。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　未返回，无法判断模型原意。
- 首轮检索请求　未进入检索
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":120,"unit":"CNY","raw":"预算放宽到120元"}]}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　The SSL connection could not be established, see inner exception.
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　复测仍返回一家 123 元的餐厅。新上限未落实。
- **逐项验收**　复测上限替换通过；过滤未通过
- **定位与编号**　检索结果过滤 B4

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮连接中断，未取得放宽价格的首轮证据。复测正确改成 120 元，但返回了 123 元的店。

- 首轮语义　未返回
- 请求错误　The SSL connection could not be established, see inner exception. Received an unexpected EOF or 0 bytes from the transport stream.

- 整组复测语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[{"field":"price_per_person","op":"lte","value":120,"unit":"CNY","raw":"预算放宽到120元"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>

#### B4　不用管价格了，找近一点的。

**① 用户要什么（验收标准）**

- 指令原话　不用管价格了，找近一点的。
- 首轮上下文　沿用 B1 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 复测上下文　沿用 B3 的 frame，候选 5 家（按原顺序：龙记香港茶餐厅(久光百货店)、浩海火烧云傣家菜(静安芮欧店)、毛头老爹饭店(静安寺店)、COMMUNEMAISON幻师(芮欧百货店)、新白鹿餐厅(静安CP店)）
- 本轮验收　取消价格硬条件；偏好距离近；本次验收按距离升序。继续找静安寺附近的餐厅，取消价格限制，按距离从近到远排列。

**② 系统听懂了吗（中间结果）**

- 理解判断　删除价格条件，改为距离近优先。
- 模型原始 JSON　未采集。
- 首轮校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[],"preferences":[{"field":"distance","direction":"lower"}]}`
- 首轮检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight
- 复测校验后 frame　原样见下方测试证据。关键字段：`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[],"preferences":[{"field":"distance","direction":"lower"}]}`
- 复测检索请求　线上实参未采集。本地同一 frame 回放：text region=上海，keywords=静安寺 → around keywords=餐厅，radius=3000，sortrule=weight

**③ 实际返回了什么、做到了吗（事实与差距）**

- 高德原始响应　未单独采集；以下数量为应用返回数量。
- 首轮应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 复测应用返回　5 家；上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验
- 关键事实　返回顺序为 78、206、148、212、245 米，近店没有优先。B2 中断，整段连续修改未完整验证。
- **逐项验收**　取消预算通过；距离排序未通过
- **定位与编号**　检索结果排序 B7

<details>
<summary>查看本条测试证据（首轮及已有复测）</summary>

首轮清除价格并识别距离偏好；返回距离 78、206、148、212、245 米，没有按近到远排列。前两轮中断影响连续性。

- 首轮语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[],"preferences":[{"field":"distance","direction":"lower"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

- 整组复测语义　`{"intent":"modify_search","target":{"category":"restaurant"},"scope":{"area":"静安寺","type":"nearby"},"constraints":[],"preferences":[{"field":"distance","direction":"lower"}],"dialogue":{"relation":"continue_task","rule_id":"T60"},"ready":true}`
- 检索　上海 · 静安寺周边 3 公里 · 高德综合排序；附加条件尚未核验；龙记香港茶餐厅(久光百货店)（4.3分，85.00元，78米，10:00-22:00）、浩海火烧云傣家菜(静安芮欧店)（4.8分，123.00元，206米，11:00-22:00）、毛头老爹饭店(静安寺店)（4.7分，110.00元，148米，11:00-15:00 17:00-22:00）、COMMUNEMAISON幻师(芮欧百货店)（4.6分，93.00元，212米，11:00-24:00）、新白鹿餐厅(静安CP店)（4.6分，65.00元，245米，10:30-14:00 16:30-21:00）

</details>



### 2026-11-17｜上传后南京西路 B 组三条独立首轮复测

完整证据：`tests/codex/results/eval-b-nanjing-2026-11-17T10-39-19-731Z.json`。三条均previous=null、candidates=[]，城市上海、首页地标南京西路。线上调用Render /parse（含真实检索）；模型原始JSON由本地同文本独立调用另行采集，绝不等同于线上模型原文。本轮未修改业务代码或规则。

#### B1　南京西路附近人均300元以上餐厅

**① 用户要什么（验收标准）**

南京西路附近餐厅，人均≥300元，包含300元。 独立首轮，无历史和候选。

**② 系统听懂了吗（中间结果）**

线上frame正确提取 price_per_person gte 300 CNY，new_task，ready=true。线上模型原始输出不由接口提供，未采集；本地单独调用的模型原文亦为gte 300，仅作为独立证据。

线上接口返回（frame或失败响应）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "南京西路"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "gte",
      "value": 300,
      "unit": "CNY",
      "raw": "300元以上"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "ready": true
}
```

本地独立模型原始JSON（非线上模型原文）：

```json
{
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "南京西路"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "gte",
      "value": 300,
      "unit": "CNY"
    }
  ]
}
```

**③ 实际返回了什么、做到了吗（事实与差距）**

应用返回5家，人均110、47、122、126、99元，全部低于300元，0/5满足。语义正确，检索未执行价格下限过滤。不能据此认为南京西路没有300元以上餐厅。

| 餐厅 | 人均（元） |
|---|---:|
| 五分之一·白领餐厅(南京西路店) | 110.00 |
| 王家沙点心店(南京西路总店) | 47.00 |
| 醉庐(南京西路) | 122.00 |
| 山石榴·贵州菜(丰盛里店) | 126.00 |
| 游牧Bistro小酒馆 by 耶里夏丽(静安丰盛里店) | 99.00 |

#### B2　南京西路人均100元以下餐厅

**① 用户要什么（验收标准）**

南京西路餐厅，人均≤100元；按以下含本数验收。 独立首轮，无历史和候选。

**② 系统听懂了吗（中间结果）**

线上连续两次HTTP 502，均返回“模型输出无效：语义 JSON 未通过字段校验”，未取得frame，也没有模型原文，不能判断具体哪个字段不合法。本地独立模型返回lt 100，按本轮lte 100标准存在等值边界偏差；不得将其当作线上失败的原始JSON。

线上接口返回（frame或失败响应）：

```json
[
  {
    "http_status": 502,
    "result": {
      "error": "模型输出无效：语义 JSON 未通过字段校验"
    }
  },
  {
    "http_status": 502,
    "result": {
      "error": "模型输出无效：语义 JSON 未通过字段校验"
    }
  }
]
```

本地独立模型原始JSON（非线上模型原文）：

```json
{
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "南京西路"
  },
  "constraints": [
    {
      "field": "price_per_person",
      "op": "lt",
      "value": 100,
      "unit": "CNY"
    }
  ]
}
```

**③ 实际返回了什么、做到了吗（事实与差距）**

解析失败，未进入本次真实检索，无价格列表；检索是否满足本条条件暂无法判断。不能把本地独立模型或其他case列表替代本次线上结果。

#### B3　南京西路高档餐厅

**① 用户要什么（验收标准）**

南京西路餐厅，满足米其林餐厅 OR 人均≥200元，任意一项即可。 独立首轮，无历史和候选。

**② 系统听懂了吗（中间结果）**

线上frame为price_level gte 4，而不是新规则的michelin OR price_per_person gte 200；语义未通过。线上没有显示反问。本地独立调用的新规则模型则正确输出any_of条件组。存在本地与线上差异；线上规则未生效、进程未重启或模型未遵守均需进一步证据区分，当前不能断言原因。

线上接口返回（frame或失败响应）：

```json
{
  "intent": "search",
  "target": {
    "category": "restaurant",
    "raw": "高档餐厅"
  },
  "scope": {
    "type": "area",
    "area": "南京西路"
  },
  "constraints": [
    {
      "field": "price_level",
      "op": "gte",
      "value": 4,
      "raw": "高档"
    }
  ],
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "ready": true
}
```

本地独立模型原始JSON（非线上模型原文）：

```json
{
  "dialogue": {
    "relation": "new_task",
    "rule_id": "T40"
  },
  "intent": "search",
  "target": {
    "category": "restaurant"
  },
  "scope": {
    "type": "area",
    "area": "南京西路"
  },
  "constraints": [
    {
      "any_of": [
        {
          "field": "michelin",
          "op": "eq",
          "value": true
        },
        {
          "field": "price_per_person",
          "op": "gte",
          "value": 200,
          "unit": "CNY"
        }
      ]
    }
  ]
}
```

**③ 实际返回了什么、做到了吗（事实与差距）**

应用返回5家，人均110、47、122、126、99元，与B1相同，均未达到200元。响应不含米其林身份核验信息，因此不能断言0/5符合OR条件，也不能认定符合高档要求。可确认线上语义未符合新业务定义，结果摘要仍写“附加条件尚未核验”。

| 餐厅 | 人均（元） |
|---|---:|
| 五分之一·白领餐厅(南京西路店) | 110.00 |
| 王家沙点心店(南京西路总店) | 47.00 |
| 醉庐(南京西路) | 122.00 |
| 山石榴·贵州菜(丰盛里店) | 126.00 |
| 游牧Bistro小酒馆 by 耶里夏丽(静安丰盛里店) | 99.00 |


### 2026-11-17｜高档新规则未生效：确认上传路径不一致

- GitHub仓库：weionly427-gif/poi-semantic-agent，默认分支main。
- 新规则出现在根目录 `spec.md`（blob sha：e96a7301bbf413065184b2981b137f02c367cb3a）。
- 实际规则路径 `rules/spec.md` 仍为旧内容，不包含高档/米其林定义（blob sha：30abe3bdd77b26ab14af230948deb47b262e8968）。
- 入口 `web.mjs` 导入 `./src/agent.mjs`；远程 `src/agent.mjs` 第4行读取 `../rules/spec.md`。路径以src/agent.mjs为基准，指向仓库rules/spec.md，而不是根目录spec.md。
- 结论：GitHub已确认规则上传位置与运行时读取位置不一致，足以解释新规则未被该加载链路读取；不是必须改src加载路径。应更新仓库 `rules/spec.md`，随后确认Render部署完成。服务只在启动时读取规则。
- 本次仅定位，未修改远程仓库、未触发部署。未直接查看Render容器内文件。证据：tests/codex/results/diagnose-rule-upload-path-2026-11-17.json。
