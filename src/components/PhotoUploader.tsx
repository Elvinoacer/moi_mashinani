'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {Camera,CheckCircle2,LoaderCircle,Upload,TriangleAlert} from 'lucide-react';
import {uploadBusinessPhotos,type PhotoUploadItem} from '@/lib/photo-upload';

const stageLabels={pending:'Pending',preparing:'Preparing image',uploading:'Uploading',processing:'Processing on server',done:'Uploaded',failed:'Failed'};
type Props={label:string;businessId?:string;multiple?:boolean;maxFiles?:number;disabled?:boolean;disabledReason?:string;camera?:boolean;readyMessage?:string;saveMessage?:string;onUploaded:(urls:string[])=>Promise<unknown>|void;onBusyChange?:(busy:boolean)=>void};
export function PhotoUploader({label,businessId,multiple=false,maxFiles=1,disabled=false,disabledReason,camera=false,readyMessage='Done. Your photo has been saved.',saveMessage='Saving to your listing…',onUploaded,onBusyChange}:Props) {
  const id=useId();const selection=useRef<File[]>([]);const uploaded=useRef<string[]>([]);const controller=useRef<AbortController|null>(null);
  const [items,setItems]=useState<PhotoUploadItem[]>([]);const [phase,setPhase]=useState<'idle'|'uploading'|'saving'|'done'|'failed'>('idle');const [error,setError]=useState('');const [pendingSave,setPendingSave]=useState(false);
  useEffect(()=>()=>controller.current?.abort(),[]);
  const busy=phase==='uploading'||phase==='saving';
  async function start(files:File[],retrySave=false) {
    if(controller.current || busy)return;
    selection.current=files;setError('');setPendingSave(retrySave);
    if(!retrySave && files.length>maxFiles){setPhase('failed');setItems([]);setError(`Choose at most ${maxFiles} ${maxFiles===1?'photo':'photos'}. Remove an existing photo to make more room.`);return;}
    controller.current=new AbortController();onBusyChange?.(true);
    try {
      if(!retrySave){uploaded.current=[];setPhase('uploading');uploaded.current=await uploadBusinessPhotos(files,businessId,{onChange:setItems,signal:controller.current.signal});}
      setPhase('saving');await onUploaded(uploaded.current);uploaded.current=[];setPendingSave(false);setPhase('done');
    } catch(cause){setPendingSave(uploaded.current.length>0);setPhase('failed');setError(cause instanceof Error?cause.message:'The upload failed. Please retry.');}
    finally{controller.current=null;onBusyChange?.(false);}
  }
  function choose(files:FileList|null){if(files?.length)void start(Array.from(files));}
  return <section aria-label={`${label} upload`} className="space-y-3 rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] p-4">
    <h3 id={id} className="text-sm font-bold text-[#243b32]">{label}</h3>
    <p className="text-xs text-[#667064]">JPG, PNG or WebP · up to 5 MB each. We compress images before uploading. {multiple?`Room for ${maxFiles} more ${maxFiles===1?'photo':'photos'}.`: 'Choose one photo.'}</p>
    <div className="flex flex-wrap gap-2">
      <label className={`inline-flex items-center gap-2 rounded-lg border border-[#dfe5d8] bg-white px-4 py-3 text-sm font-bold text-[#243b32] focus-within:outline-2 focus-within:outline-[#335e41] ${busy||disabled?'opacity-50':'cursor-pointer'}`}><Upload size={16}/>{multiple?'Choose photos':'Choose photo'}<input type="file" aria-label={label} accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={busy||disabled} className="sr-only" onChange={event=>{choose(event.target.files);event.target.value='';}}/></label>
      {camera&&<label className={`inline-flex items-center gap-2 rounded-lg border border-[#dfe5d8] bg-white px-4 py-3 text-sm font-bold text-[#243b32] focus-within:outline-2 focus-within:outline-[#335e41] ${busy||disabled?'opacity-50':'cursor-pointer'}`}><Camera size={16}/>Take a photo<input type="file" aria-label="Take a business photo" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy||disabled} className="sr-only" onChange={event=>{choose(event.target.files);event.target.value='';}}/></label>}
    </div>
    {disabledReason&&disabled&&!busy&&<p className="text-xs text-[#8a5b19]">{disabledReason}</p>}
    {items.length>0&&<ul className="space-y-2" aria-label="Selected photos">{items.map((item,index)=><li key={index} className="rounded-lg border border-[#dfe5d8] bg-white p-3 text-xs"><div className="flex items-start justify-between gap-2"><span className="min-w-0 break-all font-semibold">{item.name}</span><span className="shrink-0">{stageLabels[item.stage]}{item.stage==='uploading'?` ${item.progress}%`:''}</span></div>{item.stage==='uploading'&&<progress aria-label={`Upload progress for ${item.name}`} value={item.progress} max={100} className="mt-2 h-2 w-full accent-[#335e41]"/>}</li>)}</ul>}
    <div aria-live="polite" aria-atomic="true" className="text-sm text-[#335e41]">
      {phase==='uploading'&&<p role="status" className="flex items-center gap-2"><LoaderCircle size={16} className="animate-spin"/>Preparing, uploading and checking your photos. Keep this page open.</p>}
      {phase==='saving'&&<p role="status" className="flex items-center gap-2"><LoaderCircle size={16} className="animate-spin"/>{saveMessage}</p>}
      {phase==='done'&&<p role="status" className="flex items-start gap-2"><CheckCircle2 size={18} className="shrink-0"/>{readyMessage}</p>}
    </div>
    {phase==='failed'&&<div role="alert" className="space-y-2 rounded-lg bg-[#fce7e1] p-3 text-sm text-[#8f2424]"><p className="flex items-start gap-2"><TriangleAlert size={18} className="shrink-0"/>{error}</p>{pendingSave&&<p>Your photos uploaded, but saving them to the listing failed. Retry saving without uploading again.</p>}<button type="button" disabled={disabled&&!pendingSave} onClick={()=>void start(selection.current,uploaded.current.length>0)} className="rounded-lg bg-white px-3 py-2 font-bold disabled:opacity-50">{pendingSave?'Retry saving':'Retry upload'}</button><p className="text-xs">You can also choose different photos above.</p></div>}
    {phase==='uploading'&&<button type="button" onClick={()=>controller.current?.abort()} className="text-xs font-bold text-[#667064] underline">Cancel upload</button>}
  </section>;
}
