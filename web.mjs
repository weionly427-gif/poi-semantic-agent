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
  if((req.headers.origin && !['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))||req.headers['content-type']!=='application/json')return reply(403,{error:'请求来源或格式无效'});
  let data;
  try{let body='',size=0;req.setEncoding('utf8');for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>65536)return reply(413,{error:'指令过长'});body+=chunk}data=JSON.parse(body);if(req.url==='/search'){validate(data.frame);if(!data.home)throw Error()}else if(!data||typeof data.text!=='string'||!data.text.trim()||data.text.length>4000)throw Error();if(data.home && (typeof data.home.city!=='string'||typeof data.home.anchor!=='string'||data.home.city.length>80||data.home.anchor.length>120||(data.home.candidates!=null && (!Array.isArray(data.home.candidates)||data.home.candidates.length>10))))throw Error();if(data.previous!=null)validate(data.previous)}
  catch{return reply(400,{error:'请输入有效的指令和对话上下文'})}
  if(req.url==='/search')return reply(200,await homeSearch(data.frame,data.home));
  try{const frame=await parse(data.text,{previous:data.previous??null,candidates:data.home?.candidates || []});
    if(!data.home || data.parseOnly===true)return reply(200,frame);
    reply(200,{frame,search:await homeSearch(frame,data.home)})}catch(e){reply(502,{error:e.message==='fetch failed'?'无法连接硅基流动，请检查网络':e.message})}
}).listen(port,address,()=>console.log('Web service listening on '+address+':'+port));
