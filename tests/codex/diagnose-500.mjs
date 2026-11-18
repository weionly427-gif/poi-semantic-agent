import {parse} from '../../src/agent.mjs';
import {writeFileSync} from 'node:fs';
const radius=Number(process.argv[2] || 500);
if(!Number.isFinite(radius) || radius<=0)throw Error('请输入有效测试距离');
const report={tested_at:new Date().toISOString(),text:`找静安寺附近${radius}米以内的咖啡厅。`,attempts:[]};
try{
  report.frame=await parse(report.text,{fetcher:async(url,options)=>{
    const request=JSON.parse(options.body);
    const response=await fetch(url,options);
    const body=await response.clone().json();
    const attempt={model:request.model,status:response.status,rawAnswer:body.choices?.[0]?.message?.content,finish_reason:body.choices?.[0]?.finish_reason};
    report.attempts.push(attempt);
    console.log(JSON.stringify(attempt));
    return response;
  }});
}catch(e){report.error=e.message;}
const file=new URL(`./results/diagnose-${radius}-`+new Date().toISOString().replace(/[:.]/g,'-')+'.json',import.meta.url);
writeFileSync(file,JSON.stringify(report,null,2));
console.log(JSON.stringify({file:file.pathname,frame:report.frame,error:report.error}));
