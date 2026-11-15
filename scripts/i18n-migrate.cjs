// One-time source migration; operates on JSX text/visible attributes, never protocol values.
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../apps/backend/node_modules/typescript');
const files=['main.tsx','History.tsx','Chart.tsx','SystemRecords.tsx'];
const seen=new Set();
for(const filename of files){
 const full=path.join(__dirname,'../apps/frontend/src',filename);
 const text=fs.readFileSync(full,'utf8');
 const source=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const edits=[];
 function visit(node){
  if(ts.isJsxText(node)&&node.text.trim()){
   const clean=node.text.replace(/\s+/g,' ').replaceAll('&amp;','&').replaceAll('&gt;','>');
   seen.add(clean.trim());edits.push({start:node.pos,end:node.end,text:'{tr('+JSON.stringify(clean)+')}'});return;
  }
  if(ts.isJsxAttribute(node)&&['label','title','description','eyebrow','placeholder','aria-label','alt'].includes(node.name.getText(source))&&node.initializer&&ts.isStringLiteral(node.initializer)){
   const value=node.initializer.text;seen.add(value.trim());edits.push({start:node.initializer.getStart(source),end:node.initializer.end,text:'{tr('+JSON.stringify(value)+')}'});return;
  }
  if(ts.isJsxExpression(node)&&node.expression){
   if(ts.isJsxAttribute(node.parent)&&!['label','title','description','eyebrow','placeholder','aria-label','alt'].includes(node.parent.name.getText(source)))return;
   const expression=node.expression.getText(source);
   // Keep structured evidence and user authored text intact.
   const protectedContent=/JSON\.stringify|\.notes\b|\.acknowledgementNote\b|\.resolutionNote\b/.test(expression);
   if(!protectedContent&&!expression.startsWith('tr(')){
    edits.push({start:node.expression.getStart(source),end:node.expression.getStart(source),text:'tr('});
    edits.push({start:node.expression.end,end:node.expression.end,text:')'});
   }
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
 if(process.argv.includes('--write')&&!text.includes("from './preferences'")){
  let result=text;for(const e of edits.sort((a,b)=>b.start-a.start||b.end-a.end))result=result.slice(0,e.start)+e.text+result.slice(e.end);
  fs.writeFileSync(full,"import {tr,usePreferences} from './preferences';\n"+result);
 }
}
console.log(JSON.stringify([...seen].sort(),null,2));
