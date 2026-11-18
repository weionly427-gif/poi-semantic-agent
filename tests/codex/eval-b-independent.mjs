import {writeFileSync} from 'node:fs';
import {parse} from '../../src/agent.mjs';
import {homeSearch} from '../../src/home-search.mjs';

const file=new URL('./results/eval-b-independent-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
const report={tested_at:new Date().toISOString(),type:'三个独立首轮：本地真实模型原始输出 + Render /search + 本地固定响应定位；未修改规则或业务代码',results:[]};
const save=()=>writeFileSync(file,JSON.stringify(report,null,2));
for(const [i,text] of ['静安寺人均200元以上餐厅','静安寺人均100元以下餐厅','静安寺高档餐厅'].entries()){
  const row={id:'B'+(i+1),text,input:{previous:null,candidates:[]},model_attempts:[]};
  report.results.push(row);
  try{
    row.frame=await parse(text,{previous:null,candidates:[],fetcher:async(url,options)=>{
      const request=JSON.parse(options.body);
      const response=await fetch(url,options);
      const body=await response.clone().json();
      row.model_attempts.push({model:request.model,http_status:response.status,rawAnswer:body.choices?.[0]?.message?.content??null,finish_reason:body.choices?.[0]?.finish_reason??null});
      save();return response;
    }});
    save();
    row.render_attempts=[];
    for(let attempt=0;attempt<2;attempt++){
      const entry={tested_at:new Date().toISOString()};row.render_attempts.push(entry);
      try{
        const response=await fetch('https://poi-semantic-agent.onrender.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frame:row.frame,home:{city:'上海',anchor:'静安寺'}}),signal:AbortSignal.timeout(45000)});
        entry.http_status=response.status;
        const body=await response.text();try{entry.result=JSON.parse(body);}catch{entry.non_json_body=body.slice(0,500);}
        if(response.ok&&Array.isArray(entry.result?.places)){row.render_search=entry.result;break;}
      }catch(e){entry.error=e.message;}
      save();
    }
    row.fixture_requests=[];
    row.fixture_search=await homeSearch(row.frame,{city:'上海',anchor:'静安寺'},async url=>{
      const safe=new URL(url);safe.searchParams.delete('key');row.fixture_requests.push({path:safe.pathname,params:Object.fromEntries(safe.searchParams)});
      return new Response(JSON.stringify({status:'1',pois:url.pathname.endsWith('/text')?[{name:'静安寺',location:'121.445,31.223'}]:[65,100,123,199,200,250].map((cost,j)=>({id:'fixture-'+j,name:'测试餐厅'+j,distance:'100',business:{cost:String(cost)}}))}));
    },'fixture-only');
    if(i<2){
      row.expected={field:'price_per_person',op:i===0?'gte':'lte',value:i===0?200:100,unit:'CNY'};
      row.checks={semantic:row.frame.intent==='search'&&row.frame.dialogue?.relation==='new_task'&&row.frame.target?.category==='restaurant'&&row.frame.scope?.area==='静安寺'&&(row.frame.constraints||[]).some(c=>Object.entries(row.expected).every(([k,v])=>c[k]===v))};
      const violations=places=>places.filter(p=>p.cost!==null&&p.cost!==undefined&&String(p.cost).trim()!==''&&(i===0?Number(p.cost)<200:Number(p.cost)>100)).map(p=>({name:p.name,cost:p.cost}));
      row.checks.render_violations=row.render_search?violations(row.render_search.places):null;
      row.checks.fixture_violations=violations(row.fixture_search.places);
    }else{
      row.expected={meaning:'保留高档语义，不编造精确人均门槛；未给具体门槛不应自行定价'};
    }
  }catch(e){row.error=e.message;}
  save();console.log(JSON.stringify(row));
}
console.log('REPORT '+file.pathname);
