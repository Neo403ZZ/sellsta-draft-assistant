import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {Jobs} from './jobs.mjs';
export async function appServer({port=Number(process.env.PORT||4173),dir=process.env.DATA_DIR||fileURLToPath(new URL('./data/',import.meta.url)),research,configured=()=>Boolean(process.env.OPENAI_API_KEY&&process.env.OPENAI_MODEL)}={}){
  const jobs=new Jobs(dir,{research});await jobs.init();
  const server=createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    const expected=`http://127.0.0.1:${server.address().port}`;
    if(req.headers.host!==new URL(expected).host){send(403,{error:'127.0.0.1のローカルURLから開いてください。'});return;}
    if(req.headers.origin&&req.headers.origin!==expected){send(403,{error:'別サイトからの操作は受け付けません。'});return;}
    try{
      if(req.method==='GET'&&['/','/index.html'].includes(req.url)){const html=await readFile(new URL('./dist/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(html);return;}
      if(req.method==='GET'&&req.url==='/api/status'){send(200,{researchConfigured:configured(),sellstaConnected:false});return;}
      const match=req.url.match(/^\/api\/jobs\/([a-zA-Z0-9-]{8,80})(\/category)?$/);
      if(req.method==='GET'&&match&&!match[2]){const job=await jobs.get(match[1]);send(job?200:404,job?jobs.view(job):{error:'依頼が見つかりません。'});return;}
      if(req.method==='POST'&&(req.url==='/api/jobs'||match?.[2])){
        if(req.headers.origin!==expected||req.headers['content-type']!=='application/json'){send(403,{error:'アプリ画面から操作してください。'});return;}
        let raw='',size=0;for await(const chunk of req){size+=chunk.length;if(size>64000){send(413,{error:'入力が大きすぎます。'});return;}raw+=chunk;}
        const data=JSON.parse(raw);
        if(match?.[2]){send(200,jobs.view(await jobs.choose(match[1],data.categoryId)));return;}
        if(!configured()){send(503,{error:'API接続が未設定です。サーバーにOPENAI_API_KEYとOPENAI_MODELを設定してください。'});return;}
        if(!data.input||typeof data.input!=='object'||Array.isArray(data.input)){send(400,{error:'入力形式が不正です。'});return;}
        send(202,jobs.view(await jobs.create(data.id,data.input)));return;
      }
      send(404,{error:'対象の操作はありません。'});
    }catch(e){send(400,{error:e instanceof SyntaxError?'入力JSONを確認してください。':e.message});}
  });
  await new Promise(r=>server.listen(port,'127.0.0.1',r));return {server,jobs};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const {server}=await appServer();console.log(`Open http://127.0.0.1:${server.address().port}`);}
