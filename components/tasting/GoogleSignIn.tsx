"use client";
import { useEffect, useState } from "react";
import type { Repository } from "@/lib/repository";

export default function GoogleSignIn({repo,redirectTo}:{repo:Repository;redirectTo?:string}) {
  const [enabled,setEnabled]=useState<boolean|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    fetch(`${repo.projectUrl}/auth/v1/settings`,{headers:{apikey:repo.publishableKey},signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error();return r.json();})
      .then(s=>setEnabled((s as {external?: {google?: boolean}})?.external?.google===true))
      .catch(()=>{if(!controller.signal.aborted)setEnabled(false);});
    return ()=>controller.abort();
  },[repo]);
  return <div>
    <button type="button" className="primary" disabled={enabled!==true||busy} onClick={async()=>{
      setBusy(true);setError("");
      try {
      const {error}=await repo.client!.auth.signInWithOAuth({provider:"google",options:{redirectTo:redirectTo||window.location.origin+"/archive",queryParams:{prompt:"select_account",login_hint:"dbeks0327@yonsei.ac.kr"}}});
      if(error)throw error;
      } catch {setError("Google 로그인에 연결하지 못했어요. 잠시 후 다시 시도해주세요.");setBusy(false);}
    }}>{busy?"Google에 연결 중…":"Google로 계속하기"}</button>
    {enabled===false&&<p className="muted">Google 로그인은 연결 준비 중이에요.</p>}
    <small>기존 기록은 dbeks0327@yonsei.ac.kr 계정에 연결돼요.</small>
    {error&&<p role="alert">{error}</p>}
  </div>;
}
