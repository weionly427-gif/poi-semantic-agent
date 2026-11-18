import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,validate} from '../../src/agent.mjs';
const wrap = value => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
const result = value => ({dialogue:{relation:'new_task',rule_id:'T40'},...value});
const previous={intent:'search',target:{category:'restaurant'},scope:{type:'area',area:'中山公园'}};

test('兼容旧版历史 JSON',()=>validate(previous));
test('距离写入scope时指出具体非法字段，重试保留距离条件',async()=>{
  const invalid=result({intent:'search',target:{category:'coffee_shop'},scope:{type:'nearby',area:'静安寺',distance:500,unit:'m'}});
  assert.throws(()=>validate(invalid),/scope\.distance、scope\.unit/);
  let calls=0;
  const frame=await parse('找静安寺附近500米以内的咖啡厅。',{key:'test',fetcher:async(url,options)=>{
    const messages=JSON.parse(options.body).messages;
    if(calls++===0)return wrap(invalid);
    assert.ok(messages.at(-1).content.includes('scope.distance'));
    assert.ok(messages.at(-1).content.includes('不可丢失距离要求'));
    return wrap(result({intent:'search',target:{category:'coffee_shop'},scope:{type:'area',area:'静安寺'},constraints:[{field:'distance',op:'lte',value:500,unit:'m'}]}));
  }});
  assert.equal(calls,2);
  assert.deepEqual(frame.constraints,[{field:'distance',op:'lte',value:500,unit:'m'}]);
  assert.equal(frame.ready,true);
});
test('拒绝非法条件运算符',()=>assert.throws(()=>validate({intent:'search',constraints:[{field:'price',op:'invalid',value:1}]})));
test('缺少任务关系时修复一次',async()=>{
  let calls=0;
  const value=await parse('找餐厅',{key:'test',fetcher:async()=>wrap(calls++?result(previous):previous)});
  assert.equal(calls,2);
  assert.equal(value.ready,true);
});
test('还是和找等关键词不会提前删除历史',async()=>{
  for(const text of ['还是南京东路附近的美食吧','找个更近的','排名靠前的几家']){
    await parse(text,{previous,key:'test',fetcher:async(url,options)=>{
      const input=JSON.parse(JSON.parse(options.body).messages[1].content);
      assert.deepEqual(input.previous,previous);
      return wrap(result(previous));
    }});
  }
});
test('显式重置独立生效',async()=>{
  const value=await parse('重新开始对话',{previous});
  assert.equal(value.intent,'reset_session');
  assert.equal(value.ready,false);
});
test('反问后把任务和具体问题传回下一轮',async()=>{
  const pending=await parse('排名靠前的几家',{previous,key:'test',fetcher:async()=>wrap({
    ...previous,intent:'clarify',follow_up:'你更看重评分，还是人气？',
    dialogue:{relation:'continue_task',rule_id:'T60'}
  })});
  assert.equal(pending.ready,false);
  assert.equal(pending.dialogue.active_task.scope.area,'中山公园');
  const answered=await parse('按评分',{previous:pending,key:'test',fetcher:async(url,options)=>{
    const input=JSON.parse(JSON.parse(options.body).messages[1].content);
    assert.equal(input.pending_question,pending.follow_up);
    assert.equal(input.previous.scope.area,'中山公园');
    return wrap({...previous,preferences:[{field:'rating',direction:'higher'}],dialogue:{relation:'continue_task',rule_id:'T50'}});
  }});
  assert.equal(answered.ready,true);
  assert.equal(answered.follow_up,undefined);
  assert.equal(answered.dialogue.active_task,undefined);
});
test('新任务澄清不会继承旧地点',async()=>{
  const value=await parse('找个地方',{previous,key:'test',fetcher:async()=>wrap(result({intent:'clarify',missing:['target'],follow_up:'你想找什么地方？'}))});
  assert.equal(value.dialogue.active_task.target,undefined);
});
test('缺少搜索目标时生成具体反问',async()=>{
  const value=await parse('帮我找一个',{key:'test',fetcher:async()=>wrap(result({intent:'search'}))});
  assert.equal(value.ready,false);
  assert.ok(value.follow_up);
});
test('未知候选不能编造 ID',async()=>{
  await assert.rejects(parse('就第二家',{previous,key:'test',fetcher:async()=>wrap({
    intent:'select',target:{reference:{ordinal:2,candidate_id:'fake'}},dialogue:{relation:'continue_task',rule_id:'T60'}
  })}),/候选引用无效/);
});
test('候选引用缺少列表时反问',async()=>{
  const value=await parse('就第二家',{previous,key:'test',fetcher:async()=>wrap({
    intent:'select',target:{reference:{ordinal:2}},dialogue:{relation:'continue_task',rule_id:'T60'}
  })});
  assert.equal(value.intent,'clarify');
  assert.ok(value.follow_up);
});
test('请求失败后不修改传入的历史',async()=>{
  const snapshot=structuredClone(previous);
  await assert.rejects(parse('换一个',{previous,key:'test',fetcher:async()=>{throw Error('network failure')}}));
  assert.deepEqual(previous,snapshot);
});
test('普通推荐不因模型追问排序而被阻塞',async()=>{
  const value=await parse('推荐附近的美食',{key:'test',fetcher:async()=>wrap(result({
    intent:'clarify',target:{category:'restaurant'},follow_up:'按评分还是人气？',
    ambiguity:{type:'missing',field:'ranking_basis'}
  }))});
  assert.equal(value.ready,true);
  assert.equal(value.follow_up,undefined);
});

test('排名表达去掉句尾客套，保留数量',async()=>{
  for(const [text,expected] of [['排名靠前的我看看','排名靠前'],['排名靠前的几家我看看','排名靠前的几家'],['我看看第二家','我看看第二家']]){
    await parse(text,{previous,key:'test',fetcher:async(url,options)=>{
      assert.equal(JSON.parse(JSON.parse(options.body).messages[1].content).text,expected);
      return wrap(result(previous));
    }});
  }
});
