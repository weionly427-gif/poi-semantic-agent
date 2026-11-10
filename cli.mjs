import { createInterface } from 'node:readline/promises';
import { parse } from './agent.mjs';
let previous=null;
async function run(text){
  try { const result=await parse(text,{previous}); console.log(JSON.stringify(result,null,2)); if(result.intent!=='clarify'||!previous)previous=result; return true; }
  catch(e){console.error(e.message);return false;}
}
if(process.argv.length>2){if(!await run(process.argv.slice(2).join(' ')))process.exitCode=1;}
else{
  const rl=createInterface({input:process.stdin,output:process.stdout});
  console.log('输入导航需求，/new 开始新对话，/exit 退出。');
  try{while(true){const line=(await rl.question('> ')).trim();if(line==='/exit')break;if(line==='/new'){previous=null;continue;}if(line)await run(line);}}
  catch(e){if(e.code!=='ERR_USE_AFTER_CLOSE')throw e;}finally{rl.close();}
}

