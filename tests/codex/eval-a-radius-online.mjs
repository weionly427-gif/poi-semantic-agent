import {writeFileSync} from 'node:fs';
const base='https://poi-semantic-agent.onrender.com';
const results=[];
const output = new URL('./results/eval-a-radius-online-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json', import.meta.url);
for (const radius of [200,300,500]) {
  const text=`找静安寺附近${radius}米以内的咖啡厅。`;
  const row={text,expected_radius_m:radius};
  try {
    const response=await fetch(base+'/parse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,previous:null,home:{city:'上海',anchor:'静安寺',candidates:[]}}),signal:AbortSignal.timeout(90000)});
    row.status=response.status;
    row.result=await response.json();
    row.outside_requested_radius=(row.result.search?.places||[]).filter(p=>p.distance!==null&&p.distance>radius).map(p=>({name:p.name,distance:p.distance}));
  }catch(e){row.error=e.message;}
  results.push(row);
  writeFileSync(output,JSON.stringify({tested_at:new Date().toISOString(),base,results},null,2));
  console.log(JSON.stringify({radius,status:row.status,error:row.error||row.result?.error,frame:row.result?.frame,places:row.result?.search?.places?.map(p=>({name:p.name,distance:p.distance})),message:row.result?.search?.message}));
}
console.log('保存到：'+output.pathname);
