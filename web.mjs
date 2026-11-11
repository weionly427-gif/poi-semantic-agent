import http from 'node:http';
import {readFileSync} from 'node:fs';
import {parse,validate} from './agent.mjs';
import {homeSearch} from './home-search.mjs';
const page=readFileSync(new URL('index.html',import.meta.url));
const onRender = process.env.RENDER === 'true';
const cloud = onRender || Boolean(process.env.PORT);
const port = Number(process.env.PORT || (onRender ? 10000 : 8789));
const address = cloud ? '0.0.0.0' : '127.0.0.1';
const host='127.0.0.1:'+port;
http.createServer(async(req,res)=>{
  function reply(status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(!cloud && req.headers.host!==host)return reply(403,{error:'仅允许本机访问'});
  if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(page)}
  if(req.method!=='POST'||!['/parse','/search'].includes(req.url))return reply(404,{error:'地址无效'});
  if((req.headers.origin && !['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))||req.headers['content-type']?.split(';')[0].trim()!=='application/json')return reply(403,{error:'请求来源或格式无效'});
  let data;
  try {
    let size=0;
    const chunks=[];
    for await (const chunk of req) {
      size+=chunk.length;
      if(size>65536)return reply(413,{error:'请求超过 64 KB'});
      chunks.push(chunk);
    }
    data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch{return reply(400,{error:'请求正文不是有效的 UTF-8 JSON'})}
  if(!data || typeof data!=='object')return reply(400,{error:'请求正文需要 JSON 对象'});
  const home=data.home;
  if(home!=null && (typeof home.city!=='string'||typeof home.anchor!=='string'||home.city.length>80||home.anchor.length>120||
    (home.candidates!=null && (!Array.isArray(home.candidates)||home.candidates.length>10))))
    return reply(400,{error:'home 需要 city 和 anchor 字符串'});
  if(req.url==='/search'){
    if(!home)return reply(400,{error:'缺少 home 测试位置'});
    try{validate(data.frame)}catch{return reply(400,{error:'frame 不符合一阶段语义 JSON 格式'})}
    return reply(200,await homeSearch(data.frame,home));
  }
  if(typeof data.text!=='string'||!data.text.trim()||data.text.length>4000)return reply(400,{error:'请输入有效指令'});
  try{if(data.previous!=null)validate(data.previous)}catch{return reply(400,{error:'上一轮语义 JSON 无效'})}
  try{const frame=await parse(data.text,{previous:data.previous??null,candidates:data.home?.candidates || []});
    if(!data.home || data.parseOnly===true)return reply(200,frame);
    reply(200,{frame,search:await homeSearch(frame,data.home)})}catch(e){reply(502,{error:e.message==='fetch failed'?'无法连接硅基流动，请检查网络':e.message})}
}).listen(port,address,()=>console.log('Web service listening on '+address+':'+port));
