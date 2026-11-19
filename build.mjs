import {readFile,mkdir,writeFile} from 'node:fs/promises';
const template=await readFile(new URL('index.template.html',import.meta.url),'utf8');
const css=await readFile(new URL('styles.css',import.meta.url),'utf8');
const core=(await readFile(new URL('core.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
const app=(await readFile(new URL('app.js',import.meta.url),'utf8')).replace(/^import .*from '\.\/core.mjs';\n/,'');
await mkdir(new URL('dist/',import.meta.url),{recursive:true});
await writeFile(new URL('dist/index.html',import.meta.url),template.replace('/* STYLES */',()=>css).replace('/* APP */',()=>core+'\n'+app));
console.log('Built dist/index.html (standalone; no external dependencies)');
