import {writeFileSync} from 'node:fs';
import {parse} from '../../src/agent.mjs';

const file=new URL('./results/eval-b-nanjing-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
const report={tested_at:new Date().toISOString(),type:'三个独立首轮，线上 /parse 验证部署；本地同规则调用模型单独采集原始输出，不能当作线上模型原文',results:[]};
const save=()=>writeFileSync(file,JSON.stringify(report,null,2));
for(const [i,text] of ['南京西路附近人均300元以上餐厅','南京西路人均100元以下餐厅','南京西路高档餐厅'].entries()){
  const row={id:'B'+(i+1),text,input:{previous:null,candidates:[]},online_attempts:[],local_model_attempts:[]};
  report.results.push(row);
  for(let attempt=0;attempt<2;attempt++){
    const entry={started_at:new Date().toISOString()};row.online_attempts.push(entry);
    try{
      const response=await fetch('https://poi-semantic-agent.onrender.com/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,previous:null,home:{city:'上海',anchor:'南京西路',candidates:[]}}),signal:AbortSignal.timeout(55000)});
      entry.http_status=response.status;const body=await response.text();try{entry.result=JSON.parse(body);}catch{entry.non_json_body=body.slice(0,500);}
      if(entry.result?.frame){row.online=entry.result;break;}
    }catch(e){entry.error=e.message;}
    save();
  }
  save();
  try{
    row.local_frame=await parse(text,{previous:null,candidates:[],fetcher:async(url,options)=>{
      const request=JSON.parse(options.body),response=await fetch(url,options),body=await response.clone().json();
      row.local_model_attempts.push({model:request.model,http_status:response.status,rawAnswer:body.choices?.[0]?.message?.content??null,finish_reason:body.choices?.[0]?.finish_reason??null});save();return response;
    }});
  }catch(e){row.local_error=e.message;}
  save();console.log(JSON.stringify({id:row.id,online:row.online,local_frame:row.local_frame,local_model_attempts:row.local_model_attempts,error:row.local_error}));
}
console.log('REPORT '+file.pathname);
