import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {homeSearch} from '../../src/home-search.mjs';

const source=new URL('./results/eval-a-radius-online-result.json',import.meta.url);
const saved=JSON.parse(readFileSync(source,'utf8'));
const results=[];
for(const row of saved.results){
  const requests=[];
  const pois=row.result.search.places.map(p=>({id:p.candidate_id,name:p.name,type:p.category,distance:String(p.distance)}));
  const search=await homeSearch(row.result.frame,{city:'上海',anchor:'静安寺'},async url=>{
    const safe=new URL(url);safe.searchParams.delete('key');
    requests.push({path:safe.pathname,params:Object.fromEntries(safe.searchParams)});
    // This landmark is a fixture; no real landmark lookup is performed.
    return new Response(JSON.stringify({status:'1',pois:url.pathname.endsWith('/text')?[{name:'静安寺',location:'121.445,31.223'}]:pois}));
  },'replay-only');
  const radius=row.expected_radius_m;
  assert.equal(requests[1].params.radius,String(radius));
  assert.ok(search.places.every(p=>p.distance!==null&&p.distance<=radius));
  assert.deepEqual(search.places.map(p=>p.name),row.result.search.places.filter(p=>p.distance<=radius).map(p=>p.name));
  assert.ok(search.message.includes(`周边 ${radius} 米`));
  const result={radius,frame:row.result.frame,requests,search,pass:true};
  results.push(result);
  console.log(JSON.stringify(result));
}
writeFileSync(new URL('./results/eval-a-radius-replay-result.json',import.meta.url),JSON.stringify({tested_at:new Date().toISOString(),type:'本地修复回放：历史应用候选重建地图响应，未调用模型或高德，地标坐标为测试值',source:source.pathname,results},null,2));
