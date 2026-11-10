import test from 'node:test';
import assert from 'node:assert/strict';
import {parse,validate} from './agent.mjs';
const answer=v=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(v)}}]}));
test('保留绕行上限和洗手间偏好',()=>validate({intent:'search',constraints:[{field:'detour_time',op:'lte',value:10,unit:'min'}],preferences:[{field:'restroom',value:true}]}));
test('拒绝无效结构',()=>assert.throws(()=>validate({intent:'search',constraints:[{field:'price',op:'nonsense',value:0}]})));
test('模型结构错误可修复一次',async()=>{let n=0;const r=await parse('取消搜索',{key:'test',fetcher:async()=>answer(n++?{intent:'cancel_search'}:{intent:'invalid'})});assert.equal(n,2);assert.equal(r.intent,'cancel_search');});
test('拒绝虚构候选 ID',async()=>{await assert.rejects(parse('选第二个',{key:'test',fetcher:async()=>answer({intent:'select',target:{reference:{ordinal:2,candidate_id:'invented'}}})}),/候选引用无效/);});


test('独立搜索隔离历史，修改和参照保留历史',async()=>{
  const previous={intent:'search',target:{category:'coffee_shop'},constraints:[{field:'parking',value:true}]};
  for(const [text,inherit] of [['帮我找个餐厅',false],['导航回家',false],['换成餐厅',true],['找个比刚才那家近的',true],['重新开始对话，换成餐厅',false]]){
    const fetcher=async(url,options)=>{
      const input=JSON.parse(JSON.parse(options.body).messages[1].content);
      assert.deepEqual(input.previous,inherit?previous:null);
      assert.equal(input.candidates.length,inherit?1:0);
      return answer({intent:'search'});
    };
    await parse(text,{previous,candidates:[{ordinal:1}],key:'test',fetcher});
  }
});
test('重置后相对指令需要参照',async()=>{
  const reset=await parse('重新开始对话');
  assert.equal(reset.intent,'reset_session');
  assert.deepEqual((await parse('再近一点',{previous:reset})).missing,['target']);
});
