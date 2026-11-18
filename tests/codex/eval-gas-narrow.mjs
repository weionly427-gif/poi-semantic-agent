import {writeFileSync} from 'node:fs';
const file=new URL('./results/eval-gas-narrow-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
const results=[];
let previous=null,candidates=[];
for(const [text,radius] of [['找南京西路附近5公里以内的加油站。',5000],['只看500米以内的。',500]]){
  const row={text,expected_radius_m:radius,previous,candidates,attempts:[]};
  for(let attempt=0;attempt<2;attempt++){
    const entry={tested_at:new Date().toISOString()};
    try{
      const response=await fetch('https://poi-semantic-agent.onrender.com/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,previous,home:{city:'上海',anchor:'南京西路',candidates}}),signal:AbortSignal.timeout(90000)});
      entry.status=response.status;
      const body=await response.text();try{entry.result=JSON.parse(body);}catch{entry.non_json_body=body.slice(0,4000);}
    }catch(e){entry.error=e.message;}
    row.attempts.push(entry);
    writeFileSync(file,JSON.stringify({type:'同一对话先5公里再500米',results:[...results,row]},null,2));
    console.log(JSON.stringify({text,attempt:attempt+1,status:entry.status,error:entry.error||entry.result?.error,frame:entry.result?.frame,search:entry.result?.search}));
    if(entry.result?.frame){
      previous=entry.result.frame;
      candidates=entry.result.search?.places||[];
      break;
    }
  }
  results.push(row);
  if(!row.attempts.some(a=>a.result?.frame))break;
}
console.log(file.pathname);
