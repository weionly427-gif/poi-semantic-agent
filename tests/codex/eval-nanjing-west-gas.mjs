import {writeFileSync} from 'node:fs';
const base='https://poi-semantic-agent.onrender.com';
const output=new URL('./results/eval-nanjing-west-gas-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
const results=[];
const radii=process.argv.length>2?process.argv.slice(2).map(Number):[1,2,5];
if(radii.some(n=>!Number.isFinite(n)||n<=0))throw Error('测试距离需要为正数（公里）');
for(const km of radii){
  const text=`找南京西路附近${km}公里以内的加油站。`;
  const row={text,expected_radius_m:km*1000,tested_at:new Date().toISOString()};
  try{
    const response=await fetch(base+'/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,previous:null,home:{city:'上海',anchor:'南京西路',candidates:[]}}),signal:AbortSignal.timeout(90000)});
    row.status=response.status;
    row.content_type=response.headers.get('content-type');
    const body=await response.text();
    try{row.result=JSON.parse(body);}catch{row.non_json_body=body.slice(0,4000);}
    row.outside_requested_radius=(row.result?.search?.places||[]).filter(p=>p.distance!==null&&p.distance>km*1000).map(p=>({name:p.name,distance:p.distance}));
  }catch(e){row.error=e.message;}
  results.push(row);
  writeFileSync(output,JSON.stringify({base,results},null,2));
  console.log(JSON.stringify({km,status:row.status,error:row.error||row.result?.error,frame:row.result?.frame,places:row.result?.search?.places?.map(p=>({name:p.name,category:p.category,distance:p.distance})),message:row.result?.search?.message,outside:row.outside_requested_radius}));
}
console.log('保存到：'+output.pathname);
