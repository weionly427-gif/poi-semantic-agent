import {writeFileSync} from 'node:fs';
import {homeSearch} from '../../src/home-search.mjs';
import {parse} from '../../src/agent.mjs';

const captureRaw=process.argv.includes('--raw');
if(captureRaw && !(process.env.LLM_API_KEY||process.env.SILICONFLOW_API_KEY)) throw Error('采集模型原始输出需要配置 LLM_API_KEY 或 SILICONFLOW_API_KEY；可使用 node --env-file=配置文件路径 tests/codex/eval-b-diagnosis.mjs --raw');

const file=new URL('./results/eval-b-diagnosis-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
const report={tested_at:new Date().toISOString(),type:'线上连续对话复测 + 本地固定地图响应定位；未修改业务代码或规则',endpoint:'https://poi-semantic-agent.onrender.com/parse',results:[]};
if(captureRaw){report.type='本地规则调用真实模型，采集每次原始输出及校验后 frame，再执行检索与固定响应定位';report.endpoint='https://api.siliconflow.cn/v1/chat/completions';}
const prices=[85,123,110,93,65], distances=[78,206,148,212,245];
const names=['龙记香港茶餐厅','浩海火烧云傣家菜','毛头老爹饭店','COMMUNEMAISON幻师','新白鹿餐厅'];
const fixture=names.map((name,i)=>({id:'fixture-'+i,name,distance:String(distances[i]),business:{cost:String(prices[i])}}));
let previous=null,candidates=[];
const save=()=>writeFileSync(file,JSON.stringify(report,null,2));
for(const [i,text] of ['找静安寺附近的餐厅，人均不超过80元。','最好便宜点。','预算放宽到120元。','不用管价格了，找近一点的。'].entries()){
  const row={id:'B'+(i+1),text,input_previous:previous,attempts:[]};
  report.results.push(row);
  for(let attempt=0;attempt<2;attempt++){
    const entry={started_at:new Date().toISOString()};
    row.attempts.push(entry);
    try{
      if(captureRaw){
        entry.model_attempts=[];
        const frame=await parse(text,{previous,candidates,fetcher:async(url,options)=>{
          const request=JSON.parse(options.body);
          const response=await fetch(url,options);
          const body=await response.clone().json();
          entry.model_attempts.push({model:request.model,http_status:response.status,rawAnswer:body.choices?.[0]?.message?.content??null,finish_reason:body.choices?.[0]?.finish_reason??null});
          save();
          return response;
        }});
        entry.result={frame,search:await homeSearch(frame,{city:'上海',anchor:'静安寺'})};
      }else{
      const response=await fetch(report.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,previous,home:{city:'上海',anchor:'静安寺',candidates}}),signal:AbortSignal.timeout(55000)});
      entry.http_status=response.status;
      const body=await response.text();
      try{entry.result=JSON.parse(body);}catch{entry.non_json_body=body.slice(0,500);}
      }
    }catch(e){entry.error=e.message;}
    save();
    console.log(JSON.stringify({id:row.id,attempt:attempt+1,...entry}));
    if(entry.result?.frame){
      row.frame=entry.result.frame;
      row.online_search=entry.result.search;
      previous=row.frame;candidates=row.online_search?.places||[];
      break;
    }
  }
  if(!row.frame){row.blocked='未取得本轮语义，停止连续对话，避免伪造上下文';save();break;}
  row.local_fixture_requests=[];
  row.local_fixture_search=await homeSearch(row.frame,{city:'上海',anchor:'静安寺'},async url=>{
    const safe=new URL(url);safe.searchParams.delete('key');
    row.local_fixture_requests.push({path:safe.pathname,params:Object.fromEntries(safe.searchParams)});
    return new Response(JSON.stringify({status:'1',pois:url.pathname.endsWith('/text')?[{name:'静安寺',location:'121.445,31.223'}]:fixture}));
  },'fixture-only');
  const cs=row.frame.constraints||[],ps=row.frame.preferences||[];
  const price=c=>['price_per_person','price'].includes(c.field);
  const cap=i<2?80:i===2?120:null;
  row.checks={semantic:row.frame.ready===true&&row.frame.target?.category==='restaurant'&&row.frame.scope?.area==='静安寺'&&(cap===null?!cs.some(price)&&!ps.some(price)&&ps.some(p=>p.field==='distance'&&p.direction==='lower'):cs.some(c=>price(c)&&c.op==='lte'&&c.value===cap)&&(i!==1||ps.some(p=>price(p)&&p.direction==='lower')))};
  const assess=places=>places.length ? ({over_budget:cap===null?[]:places.filter(p=>Number(p.cost)>cap).map(p=>({name:p.name,cost:p.cost})),ascending_price:places.every((p,j)=>j===0||Number(places[j-1].cost)<=Number(p.cost)),ascending_distance:places.every((p,j)=>j===0||places[j-1].distance<=p.distance)}) : ({evaluated:false,reason:'没有候选，不能判断过滤或排序是否通过'});
  row.search_source=captureRaw?'本机配置调用高德；无高德密钥时未执行':'已部署服务';
  row.checks.online=assess(row.online_search?.places||[]);
  row.checks.local_fixture=assess(row.local_fixture_search.places);
  save();
  console.log(JSON.stringify({id:row.id,checks:row.checks,local_fixture_search:row.local_fixture_search}));
}
console.log('REPORT '+file.pathname);
