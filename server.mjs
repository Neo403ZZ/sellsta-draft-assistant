import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||4173);
// HTML-only first release. There is intentionally no pretend /execute endpoint.
createServer(async(req,res)=>{
  if(req.method!=='GET'){res.writeHead(405,{'Allow':'GET'});res.end('Method not allowed');return;}
  if(req.url!=='/' && req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
  try{const html=await readFile(new URL('./dist/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end(html);}catch{res.writeHead(503);res.end('Run npm run build first.');}
}).listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`Preview listening on port ${port}`));
