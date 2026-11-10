import http from 'node:http';
import {readFileSync} from 'node:fs';
import {parse,validate} from './agent.mjs';
const page=readFileSync(new URL('index.html',import.meta.url));
const port=Number(process.env.PORT||8789);
const cloud=Boolean(process.env.PORT);
const host='127.0.0.1:'+port;
http.createServer(async(req,res)=>{
  function reply(status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(!cloud && req.headers.host!==host)return reply(403,{error:'仅允许本机访问'});
  if(req.method==='GET'&&req.url==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(page)}
  if(req.method!=='POST'||req.url!=='/parse')return reply(404,{error:'地址无效'});
  if((req.headers.origin && !['http://'+req.headers.host,'https://'+req.headers.host].includes(req.headers.origin))||req.headers['content-type']!=='application/json')return reply(403,{error:'请求来源或格式无效'});
  let data;
  try{let body='',size=0;req.setEncoding('utf8');for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>65536)return reply(413,{error:'指令过长'});body+=chunk}data=JSON.parse(body);if(!data||typeof data.text!=='string'||!data.text.trim()||data.text.length>4000)throw Error();if(data.previous!=null)validate(data.previous)}
  catch{return reply(400,{error:'请输入有效的指令和对话上下文'})}
  try{reply(200,await parse(data.text,{previous:data.previous??null}))}catch(e){reply(502,{error:e.message==='fetch failed'?'无法连接硅基流动，请检查网络':e.message})}
}).listen(port,cloud?'0.0.0.0':'127.0.0.1',()=>console.log('Web service listening on port '+port));
