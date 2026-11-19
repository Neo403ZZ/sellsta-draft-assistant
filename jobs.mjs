import {mkdir,readFile,writeFile,rename,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {researchProduct,prepareRequest} from './research.mjs';
import {defaults,validateInput} from './core.mjs';
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(id);
export class Jobs {
  constructor(dir,{research=researchProduct}={}){this.dir=dir;this.research=research;this.running=new Map();this.creating=new Set();}
  async init(){await mkdir(this.dir,{recursive:true,mode:0o700});for(const name of await readdir(this.dir)){if(!name.endsWith('.json'))continue;const j=await this.get(name.slice(0,-5));if(j?.status==='researching'){j.status='interrupted';j.message='前回の調査中にサーバーが終了しました。自動再送はしていません。';await this.save(j);}}}
  async get(id){if(!validId(id))throw Error('依頼IDが不正です。');try{return JSON.parse(await readFile(join(this.dir,id+'.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
  async save(job){job.updatedAt=new Date().toISOString();const path=join(this.dir,job.id+'.json');await writeFile(path+'.tmp',JSON.stringify(job),{mode:0o600});await rename(path+'.tmp',path);}
  async create(id,input){if(!validId(id))throw Error('依頼IDが不正です。');if(this.creating.has(id))throw Error('同じ依頼を受付中です。少し待って確認してください。');this.creating.add(id);try{
    const old=await this.get(id);if(old){if(JSON.stringify(old.input)!==JSON.stringify(input))throw Error('同じ依頼IDに異なる内容を送信できません。');return old;}
    const errors=validateInput({...defaults,...input});if(errors.length)throw Error(errors.join('\n'));
    const job={id,input,createdAt:new Date().toISOString(),status:'researching',research:null,categoryId:null,message:'商品URLと公式仕様を調査しています。'};await this.save(job);
    const work=this.run(job).finally(()=>this.running.delete(id));this.running.set(id,work);return job;
  }finally{this.creating.delete(id);}}
  async run(job){try{job.research=await this.research(job.input);const n=job.research.categories.length;job.status=n>1?'needs_category':n===1?'ready_for_sellsta':'needs_input';job.categoryId=n===1?job.research.categories[0].id:null;job.message=n>1?'カテゴリを選んでください。':n===1?'調査済み。SELLSTA自動操作は未接続です。':'カテゴリを確認できません。調査結果を確認してください。';}catch(e){job.status='failed';job.message=e.name==='TimeoutError'?'調査がタイムアウトしました。自動再送はしていません。':e.message;}await this.save(job);}
  async choose(id,categoryId){const job=await this.get(id);if(!job||!['needs_category','ready_for_sellsta'].includes(job.status)||!job.research.categories.some(c=>c.id===categoryId))throw Error('提示されたカテゴリから選択してください。');job.categoryId=categoryId;job.status='ready_for_sellsta';job.message='カテゴリを確定しました。SELLSTA自動操作は未接続です。';await this.save(job);return job;}
  view(job){if(!job)return null;return {...job,...(job.status==='ready_for_sellsta'?prepareRequest(job):{})};}
}
