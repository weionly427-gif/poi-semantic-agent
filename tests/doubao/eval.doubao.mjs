// 评测脚本：真实调用硅基流动模型，逐条跑用例并对照断言。
// 用法：node --env-file=<备用.env> eval.doubao.mjs
import { parse } from '../../src/agent.mjs';
import { writeFileSync } from 'node:fs';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 断言工具 ----------
const eq = (a, b) => a === b;
const includes = (text, sub) => typeof text === 'string' && text.includes(sub);

function findCond(list, pred) {
  if (!Array.isArray(list)) return undefined;
  for (const c of list) {
    if (c && (c.any_of || c.all_of)) {
      const nested = findCond(c.any_of || c.all_of, pred);
      if (nested) return nested;
    } else if (pred(c)) return c;
  }
  return undefined;
}

function matchConstraints(list, spec) {
  const hits = [];
  for (const s of spec) {
    const item = findCond(list, c =>
      (!('field' in s) || eq(c.field, s.field)) &&
      (!('op' in s) || eq(c.op, s.op)) &&
      (!('unit' in s) || eq(c.unit, s.unit)) &&
      (!('value' in s) || JSON.stringify(c.value) === JSON.stringify(s.value))
    );
    if (item) hits.push(item);
  }
  return hits;
}

function evaluate(result, expect) {
  const fails = [];
  if (!expect) return { pass: true, fails };

  if ('intent' in expect && !eq(result.intent, expect.intent))
    fails.push(`intent 期望 ${expect.intent}，实际 ${result.intent}`);
  if ('ready' in expect && !eq(result.ready, expect.ready))
    fails.push(`ready 期望 ${expect.ready}，实际 ${result.ready}`);

  if (expect.target) {
    const t = result.target || {};
    if (expect.target.category && !eq(t.category, expect.target.category))
      fails.push(`target.category 期望 ${expect.target.category}，实际 ${t.category}`);
    if (expect.target.brand && !includes(t.brand || '', expect.target.brand))
      fails.push(`target.brand 期望含 ${expect.target.brand}，实际 ${t.brand}`);
    if (expect.target.any_of_len && (!Array.isArray(t.any_of) || t.any_of.length !== expect.target.any_of_len))
      fails.push(`target.any_of 长度期望 ${expect.target.any_of_len}，实际 ${t.any_of?.length}`);
    if (expect.target.reference) {
      const r = t.reference || {};
      if (expect.target.reference.ordinal && !eq(r.ordinal, expect.target.reference.ordinal))
        fails.push(`reference.ordinal 期望 ${expect.target.reference.ordinal}，实际 ${r.ordinal}`);
      if (expect.target.reference.candidate_id && !eq(r.candidate_id, expect.target.reference.candidate_id))
        fails.push(`reference.candidate_id 期望 ${expect.target.reference.candidate_id}，实际 ${r.candidate_id}`);
    }
  }

  if (expect.scope) {
    const s = result.scope || {};
    if (expect.scope.type && !eq(s.type, expect.scope.type))
      fails.push(`scope.type 期望 ${expect.scope.type}，实际 ${s.type}`);
    if (expect.scope.area && !includes(s.area || '', expect.scope.area))
      fails.push(`scope.area 期望含 ${expect.scope.area}，实际 ${s.area}`);
    if (expect.scope.areaAbsent && s.area)
      fails.push(`scope.area 应清除，实际 ${s.area}`);
  }

  if (expect.constraints) {
    const hits = matchConstraints(result.constraints, expect.constraints);
    if (hits.length !== expect.constraints.length)
      fails.push(`constraints 命中 ${hits.length}/${expect.constraints.length}：${JSON.stringify(result.constraints)}`);
  }
  if (expect.constraintsAbsent) {
    for (const f of expect.constraintsAbsent) {
      if (findCond(result.constraints, c => c.field === f))
        fails.push(`constraints 不应含 ${f}`);
    }
  }

  if (expect.preferences) {
    const hits = matchConstraints(result.preferences, expect.preferences);
    if (hits.length !== expect.preferences.length)
      fails.push(`preferences 命中 ${hits.length}/${expect.preferences.length}：${JSON.stringify(result.preferences)}`);
  }
  if (expect.preferencesAbsent) {
    for (const f of expect.preferencesAbsent) {
      if (findCond(result.preferences, c => c.field === f))
        fails.push(`preferences 不应含 ${f}`);
    }
  }
  if ('preference_orderAbsent' in expect && result.preference_order)
    fails.push(`不应有 preference_order，实际 ${JSON.stringify(result.preference_order)}`);

  if (expect.missing && !(result.missing || []).some(m => expect.missing.includes(m)))
    fails.push(`missing 期望含 ${expect.missing}，实际 ${JSON.stringify(result.missing)}`);

  if (expect.ambiguity) {
    const a = result.ambiguity || {};
    if (expect.ambiguity.type && !eq(a.type, expect.ambiguity.type))
      fails.push(`ambiguity.type 期望 ${expect.ambiguity.type}，实际 ${a.type}`);
    if (expect.ambiguity.field && !eq(a.field, expect.ambiguity.field))
      fails.push(`ambiguity.field 期望 ${expect.ambiguity.field}，实际 ${a.field}`);
  }

  if (expect.dialogue) {
    const d = result.dialogue || {};
    if (expect.dialogue.relation && !eq(d.relation, expect.dialogue.relation))
      fails.push(`dialogue.relation 期望 ${expect.dialogue.relation}，实际 ${d.relation}`);
  }

  if ('tasks_len' in expect && (!Array.isArray(result.tasks) || result.tasks.length !== expect.tasks_len))
    fails.push(`tasks 长度期望 ${expect.tasks_len}，实际 ${result.tasks?.length}`);

  if (expect.check) {
    const r = expect.check(result);
    if (!r.pass) fails.push(r.note);
  }

  return { pass: fails.length === 0, fails };
}

// ---------- 用例 ----------
const prevMeal = { intent: 'search', target: { category: 'restaurant' }, scope: { type: 'area', area: '中山公园' } };
const prevPrice = { intent: 'search', target: { category: 'restaurant' }, constraints: [{ field: 'price_per_person', op: 'gte', value: 50, unit: 'CNY' }] };
const pendingClarify = {
  intent: 'clarify', ready: false, target: { category: 'restaurant' }, scope: { type: 'area', area: '中山公园' },
  follow_up: '你更看重评分，还是人气？',
  dialogue: { relation: 'continue_task', rule_id: 'T60', active_task: { intent: 'search', target: { category: 'restaurant' }, scope: { type: 'area', area: '中山公园' } } }
};
const candidates = [
  { candidate_id: 'a1', list_version: 'v1', ordinal: 1, name: 'A店' },
  { candidate_id: 'a2', list_version: 'v1', ordinal: 2, name: 'B店' }
];

const cases = [
  // A. 意图与目标
  { id: 1, group: 'P0 意图', text: '找个充电站', expect: { intent: 'search', target: { category: 'charger' } } },
  { id: 2, group: 'P0 意图', text: '找星巴克', expect: { intent: 'search', target: { brand: '星巴克' } } },
  { id: 3, group: 'P0 范围', text: '附近找个餐厅', expect: { scope: { type: 'nearby' }, target: { category: 'restaurant' } } },
  { id: 4, group: 'P0 范围', text: '顺路找个加油站', expect: { scope: { type: 'along_route' }, target: { category: 'gas' } } },
  { id: 5, group: 'P0 范围', text: '终点附近找停车场', expect: { scope: { type: 'destination' }, target: { category: 'parking' } } },
  { id: 6, group: 'P0 范围', text: '朝阳区找个酒店', expect: { scope: { type: 'area', area: '朝阳' }, target: { category: 'hotel' } } },
  { id: 7, group: 'P1 口语类别', text: '吃饭的地方', expect: { check: r => ({ pass: r.intent === 'search' || (r.intent === 'clarify' && (r.target?.category || r.target?.raw)), note: '既非 search 也未给出类别：' + JSON.stringify(r.target) }) } },
  { id: 8, group: 'P1 排除类别', text: '不要咖啡店，来点别的', expect: { check: r => { const s = JSON.stringify(r); const ok = /ne|exclude|排除/.test(s) && /coffee/.test(s); return { pass: ok, note: '未见类别排除表达：' + s }; } } },
  { id: 9, group: 'P0 取消', text: '算了，不找了', expect: { intent: 'cancel_search', ready: false } },
  { id: 10, group: 'P0 缺失目标', text: '帮我找一个', expect: { intent: 'clarify', ready: false, missing: ['target'], check: r => ({ pass: !!r.follow_up, note: '缺少 follow_up' }) } },
  { id: 11, group: 'P2 域外', text: '播放音乐', expect: { intent: 'out_of_domain' } },
  { id: 12, group: 'P2 操作类', text: '打电话给那家店', expect: { check: r => ({ pass: r.intent === 'call' || (r.intent === 'clarify' && r.target?.reference?.label), note: '既非 call 也未形成候选引用：' + JSON.stringify(r) }) } },

  // B. 数值表达（补全目标，避免缺目标干扰约束抽取判断）
  { id: 13, group: 'P0 数值归属', text: '找个充电站，最多绕十分钟', expect: { constraints: [{ field: 'detour_time', op: 'lte', value: 10, unit: 'min' }] } },
  { id: 14, group: 'P0 数值归属反例', text: '找个加油站，最多等十分钟', expect: { constraints: [{ field: 'wait_time', op: 'lte', value: 10, unit: 'min' }], constraintsAbsent: ['detour_time'] } },
  { id: 15, group: 'P1 数值单位', text: '找个餐厅，半小时以内能到', expect: { check: r => { const c = (r.constraints || []).find(x => x.value === 30 && x.unit === 'min'); return { pass: !!c, note: '未找到 30 分钟到达上限：' + JSON.stringify(r.constraints) }; } } },
  { id: 16, group: 'P1 距离上限', text: '找个不超过3公里的咖啡店', expect: { check: r => { const c = (r.constraints || []).find(x => /distance|radius/.test(x.field || '') && x.op === 'lte' && Number(x.value) === 3); return { pass: !!c, note: '未找到距离≤3公里：' + JSON.stringify(r.constraints) }; } } },
  { id: 17, group: 'P0 数值下限', text: '找个评分至少4分的餐厅', expect: { constraints: [{ field: 'rating', op: 'gte', value: 4 }] } },
  { id: 18, group: 'P1 区间', text: '找个人均50到100元的火锅', expect: { constraints: [{ field: 'price_per_person', op: 'range', value: [50, 100] }] } },
  { id: 19, group: 'P1 近似数', text: '找个充电站，绕十来分钟也行', expect: { check: r => { const c = (r.constraints || []).find(x => x.field === 'detour_time'); const ok = c && (/approx/.test(c.op || '') || /十来/.test(c.raw || '')) && Number(c.value) >= 8 && Number(c.value) <= 12; return { pass: !!ok, note: '近似数未保留：' + JSON.stringify(c) }; } } },
  { id: 20, group: 'P1 模糊数量', text: '找个三五公里左右的咖啡店', expect: { check: r => { const c = (r.constraints || []).find(x => /distance|radius/.test(x.field || '')); const ok = c && Number(c.value) !== 4 && (/三五/.test(c.raw || '') || /approx/.test(c.op || '')); return { pass: !!ok, note: '模糊值被取中间值或未保留 raw：' + JSON.stringify(c) }; } } },
  { id: 21, group: 'P1 否定数值', text: '找个充电站，不要绕超过5分钟', expect: { constraints: [{ field: 'detour_time', op: 'lte', value: 5 }] } },
  { id: 22, group: 'P1 时间参照', text: '找个晚上九点还开着的咖啡店', expect: { check: r => { const s = JSON.stringify(r); const ok = /open_now|business_hours|opentime|21:00|21/.test(s); return { pass: ok, note: '未见营业状态/21:00 参照：' + s }; } } },

  // C. 条件与偏好
  { id: 23, group: 'P0 硬条件', text: '找个必须有洗手间的餐厅', expect: { constraints: [{ field: 'restroom', op: 'eq', value: true }] } },
  { id: 24, group: 'P0 软偏好', text: '找个最好有洗手间的餐厅', expect: { preferences: [{ field: 'restroom', value: true }] } },
  { id: 25, group: 'P0 模糊偏好', text: '找个近一点的餐厅', expect: { preferences: [{ field: 'distance', direction: 'lower' }] } },
  { id: 26, group: 'P0 价格偏好', text: '找个便宜点的餐厅', expect: { preferences: [{ field: 'price', direction: 'lower' }] } },
  { id: 27, group: 'P1 多偏好', text: '找个又近又便宜最好的餐厅', expect: { preferences: [{ field: 'distance', direction: 'lower' }, { field: 'price', direction: 'lower' }], preference_orderAbsent: true } },
  { id: 28, group: 'P1 任选类别', text: '咖啡店或便利店都行', expect: { target: { any_of_len: 2 } } },
  { id: 29, group: 'P1 复合条件', text: '找个必须有停车场、还要现在营业的酒店', expect: { check: r => { const s = JSON.stringify(r.constraints || []); const ok = /parking/.test(s) && /open_now|营业/.test(s); return { pass: ok, note: '停车+营业双硬条件未齐全：' + s }; } } },

  // D. 冲突
  { id: 30, group: 'P1 条件冲突', text: '找个人均至少100元、最多80元的餐厅', expect: { ambiguity: { type: 'conflict', field: 'price_per_person' } } },

  // E. 多轮（补充组）
  { id: 'M1', group: '多轮 补充', text: '再近一点', previous: prevMeal, expect: { dialogue: { relation: 'continue_task' }, preferences: [{ field: 'distance', direction: 'lower' }], target: { category: 'restaurant' } } },
  { id: 'M2', group: '多轮 补充', text: '换成咖啡店', previous: prevMeal, expect: { target: { category: 'coffee_shop' }, scope: { area: '中山公园' } } },
  { id: 'M3', group: '多轮 补充', text: '帮我找个加油站', previous: prevMeal, expect: { dialogue: { relation: 'new_task' }, target: { category: 'gas' }, scope: { areaAbsent: true } } },
  { id: 'M4', group: '多轮 澄清应答', text: '按评分', previous: pendingClarify, expect: { ready: true, preferences: [{ field: 'rating', direction: 'higher' }], check: r => ({ pass: !r.follow_up, note: '应答后仍保留 follow_up' }) } },
  { id: 'M5', group: '多轮 候选选择', text: '就第二家', previous: prevMeal, candidates, expect: { target: { reference: { ordinal: 2, candidate_id: 'a2' } } } },
  { id: 'M6', group: '多轮 同句改口', text: '找餐厅，不，找咖啡店', expect: { target: { category: 'coffee_shop' } } },
  { id: 'M7', group: '多轮 删除条件', text: '不用管价格了', previous: prevPrice, expect: { constraintsAbsent: ['price_per_person'], preferencesAbsent: ['price_per_person'] } },
  { id: 'M8', group: 'P2 多目标', text: '先去加油站，再去咖啡店', expect: { tasks_len: 2 } }
];

// ---------- 执行（含 429 退避与间隔） ----------
const results = [];
let pass = 0, clarify = 0, totalMs = 0;

async function runOne(c) {
  let lastErr, captured = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    const fetcher = async (url, opts) => {
      const res = await fetch(url, opts);
      if (res.ok) {
        const body = await res.clone().json().catch(() => ({}));
        captured.answer = body.choices?.[0]?.message?.content;
      }
      captured.status = res.status;
      return res;
    };
    const t = Date.now();
    try {
      const result = await parse(c.text, { previous: c.previous ?? null, candidates: c.candidates ?? [], fetcher });
      return { result, ms: Date.now() - t, captured };
    } catch (e) {
      lastErr = e.message;
      captured.error = e.message;
      if (/429/.test(e.message) && attempt < 2) { await sleep(8000 * (attempt + 1)); continue; }
      if (attempt < 2) { await sleep(3000); continue; }
      return { result: null, ms: Date.now() - t, captured, error: lastErr };
    }
  }
  return { result: null, ms: 0, captured, error: lastErr };
}

for (const c of cases) {
  const { result, ms, captured, error } = await runOne(c);
  totalMs += ms;
  let evalRes = { pass: false, fails: ['解析异常：' + error] };
  if (result) evalRes = evaluate(result, c.expect);
  if (evalRes.pass) pass++;
  if (result && (result.intent === 'clarify' || result.ambiguity)) clarify++;
  results.push({ id: c.id, group: c.group, text: c.text, pass: evalRes.pass, ms, fails: evalRes.fails, result: result ?? null, rawAnswer: captured.answer, status: captured.status, error });
  console.log(`${evalRes.pass ? 'PASS' : 'FAIL'} [${c.id}] ${c.text} (${ms}ms)${evalRes.pass ? '' : ' — ' + evalRes.fails.join('；')}`);
  await sleep(1200);
}

const main = results.filter(r => typeof r.id === 'number');
const summary = {
  total: results.length,
  mainTotal: main.length,
  pass,
  mainPass: main.filter(r => r.pass).length,
  passRate: (pass / results.length * 100).toFixed(1) + '%',
  clarifyOrAmbiguity: clarify,
  avgMs: Math.round(totalMs / results.length),
  maxMs: Math.max(...results.map(r => r.ms)),
  failed: results.filter(r => !r.pass).map(r => ({ id: r.id, text: r.text, fails: r.fails, status: r.status, rawAnswer: r.rawAnswer }))
};
console.log('\n===== 汇总 =====');
console.log(JSON.stringify(summary, null, 2));
writeFileSync(new URL('./results/eval-result.doubao.json', import.meta.url), JSON.stringify({ summary, results }, null, 2), 'utf8');
