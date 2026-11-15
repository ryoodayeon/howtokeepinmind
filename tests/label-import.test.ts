import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {readLabelArchive} from '../lib/label-import.ts';
import {emptyArchive} from '../lib/domain.ts';
const bid='11111111-1111-4111-8111-111111111111', pid='22222222-2222-4222-8222-222222222222';
const beverage={id:bid,name:'Label wine',category:'wine' as const,producer:'',subtype:'',year:null,metadata:{label_status:'Unconfirmed'},origin_ids:[],created_at:'2026-11-15T00:00:00Z',updated_at:'2026-11-15T00:00:00Z'};
const photo={id:pid,beverage_id:bid,file:'images/label.jpg',sort_order:0,is_cover:true};
function archive(changes:Record<string,unknown>={}){return zipSync({'manifest.json':strToU8(JSON.stringify({format:'tasting-atlas-labels-v1',beverages:[beverage],origins:[],photos:[photo],...changes})),'images/label.jpg':new Uint8Array([255,216,255,217])});}
test('reimport preserves existing product edits and skips saved photo IDs',()=>{
 const current=emptyArchive();current.beverages.push({...beverage,name:'My edited name'});
 const plan=readLabelArchive(archive(),current);assert.equal(plan.beverages.length,0);assert.equal(plan.photos.length,1);assert.equal(current.beverages[0].name,'My edited name');
 current.photos.push({id:pid,beverage_id:bid,tasting_id:null,url:'private',sort_order:0,is_cover:true});
 assert.equal(readLabelArchive(archive(),current).photos.length,0);
});
test('missing references and files reject the entire import before upload',()=>{
 assert.throws(()=>readLabelArchive(archive({beverages:[]}),emptyArchive()),/음료/);
 assert.throws(()=>readLabelArchive(archive({photos:[{...photo,file:'images/missing.jpg'}]}),emptyArchive()),/사진/);
});
test('label-only import rejects injected tasting records and path traversal',()=>{
 assert.throws(()=>readLabelArchive(archive({tastings:[{notes:'Invented experience'}]}),emptyArchive()));
 assert.throws(()=>readLabelArchive(archive({photos:[{...photo,file:'../label.jpg'}]}),emptyArchive()));
});
test('duplicate IDs cannot produce conflicting photo or beverage links',()=>{
 assert.throws(()=>readLabelArchive(archive({photos:[photo,photo]}),emptyArchive()),/중복/);
});
