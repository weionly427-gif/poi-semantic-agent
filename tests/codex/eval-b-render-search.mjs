import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('./results/eval-b-diagnosis-2026-11-17T10-04-39-291Z.json',import.meta.url);
const report=JSON.parse(readFileSync(source,'utf8'));
const output=new URL('./results/eval-b-render-search-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
report.render_search_started_at=new Date().toISOString();
for(const row of report.results){
  // The original local run did not have a map key. Empty results cannot pass sorting checks.
  row.search_source='本机未配置高德密钥，未执行真实地图查询';
  row.checks.online={evaluated:false,reason:'本机没有高德密钥'};
  row.render_search_attempts=[];
  for(let attempt=0;attempt<2;attempt++){
    const entry={tested_at:new Date().toISOString()};
    row.render_search_attempts.push(entry);
    try{
      const response=await fetch('https://poi-semantic-agent.onrender.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({frame:row.frame,home:{city:'上海',anchor:'静安寺'}}),signal:AbortSignal.timeout(45000)});
      entry.http_status=response.status;
      const text=await response.text();
      try{entry.result=JSON.parse(text);}catch{entry.non_json_body=text.slice(0,500);}
      if(response.ok&&Array.isArray(entry.result?.places)){
        row.render_search=entry.result;
        const ps=entry.result.places,cap=row.id==='B3'?120:row.id==='B4'?null:80;
        row.checks.render=ps.length?{over_budget:cap===null?[]:ps.filter(p=>Number(p.cost)>cap).map(p=>({name:p.name,cost:p.cost})),ascending_price:ps.every((p,i)=>!i||Number(ps[i-1].cost)<=Number(p.cost)),ascending_distance:ps.every((p,i)=>!i||ps[i-1].distance<=p.distance)}:{evaluated:false,reason:entry.result.message};
        break;
      }
    }catch(e){entry.error=e.message;}
  }
  writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({id:row.id,checks:row.checks.render,search:row.render_search,error:row.render_search_attempts.at(-1)?.error}));
}
console.log('REPORT '+output.pathname);
