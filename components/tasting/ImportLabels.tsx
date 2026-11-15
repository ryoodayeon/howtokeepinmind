"use client";
import { useState } from "react";
import type { Archive } from "@/lib/domain";
import type { Repository } from "@/lib/repository";
import { readLabelArchive, type LabelImport } from "@/lib/label-import";

export default function ImportLabels({data, repo, onImported}: {data: Archive; repo: Repository; onImported: () => Promise<void>}) {
  const [plan, setPlan] = useState<LabelImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!repo.client) return null;
  return <section className="settings-card">
    <h2>와인 라벨 기록 가져오기</h2>
    <p className="muted">정리된 라벨 ZIP의 새 와인과 사진을 비공개 아카이브에 추가해요. 기존 기록은 유지하며, 사진으로 시음 기록을 만들지 않아요.</p>
    <input aria-label="정리된 와인 라벨 ZIP" type="file" accept=".zip" disabled={busy} onChange={async e => {
      const file=e.target.files?.[0]; setPlan(null); setMessage(""); if(!file)return;
      try {setBusy(true); setPlan(readLabelArchive(new Uint8Array(await file.arrayBuffer()), data));}
      catch(error){setMessage(error instanceof Error ? error.message : "파일을 읽지 못했어요.");}
      finally {setBusy(false);}
    }}/>
    {plan && <><p>새 와인 {plan.beverages.length}건 · 새 사진 {plan.photos.length}장</p>
    <button className="primary" disabled={busy} onClick={async()=>{
      if(!repo.client)return;setBusy(true);setMessage("");
      try {
        const {data:{user},error}=await repo.client.auth.getUser();if(error||!user)throw Error("먼저 로그인해주세요.");
        // Recheck IDs so repeated uploads and another tab's successful import are safe.
        const current=await repo.load();
        const photos=plan.photos.filter(p=>!current.photos.some(x=>x.id===p.id));
        const rows=[];
        for(let i=0;i<photos.length;i++){
          const p=photos[i], path=`${user.id}/label-import/${p.id}.${p.file.split('.').pop()}`;
          const {error}=await repo.client.storage.from("tasting-photos").upload(path,plan.files[p.file],{contentType:p.file.endsWith('.png')?'image/png':'image/jpeg',upsert:false});
          if(error && !/already exists|duplicate/i.test(error.message))throw error;
          rows.push({id:p.id,beverage_id:p.beverage_id,tasting_id:null,storage_path:path,sort_order:p.sort_order,is_cover:p.is_cover});
          setMessage(`사진 저장 중 ${i+1}/${photos.length}`);
        }
        const {error:saveError}=await repo.client.rpc("import_local_archive",{payload:{beverages:plan.beverages,origins:plan.origins,tastings:[],photos:rows}});
        if(saveError)throw saveError;
        await onImported();setMessage(`저장 완료 · 와인 ${plan.beverages.length}건 · 사진 ${photos.length}장`);setPlan(null);
      }catch(error){setMessage(error instanceof Error?error.message:"저장하지 못했어요. 같은 파일로 다시 시도할 수 있어요.");}
      finally{setBusy(false);}
    }}>{busy?"저장 중…":"라벨 기록 저장"}</button></>}
    {message && <p role="status">{message}</p>}
  </section>;
}
