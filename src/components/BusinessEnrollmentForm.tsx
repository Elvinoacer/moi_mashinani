'use client';

import {useState,type FormEvent} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,Check,CheckCircle2,Clock3,MapPin,Plus,Search,Sparkles,Trash2,Camera,RotateCw} from 'lucide-react';
import {ZONES} from '@/lib/constants';
import {CategorySelect} from '@/components/CategorySelect';
import {PhotoUploader} from '@/components/PhotoUploader';
import {FREE_PRODUCT_LIMIT} from '@/lib/catalog-plan';
import {ENROLLMENT_DAYS,enrollmentTemplate,templateSuggestions,suggestedEnrollmentCopy,hoursPreset} from '@/lib/enrollment-templates';
import type {Business,BusinessHours} from '@/lib/types';

type ProductDraft={id:string;name:string;price:string;unit:string;photo:string};
type FormResult={business:Business;invitation:{sent:boolean;error?:string}};
type Details={ownerName:string;ownerEmail:string;ownerPhone:string;name:string;primaryCategory:string;phone:string;whatsapp:string;zone:string;landmark:string;address:string;latitude:string;longitude:string;tagline:string;description:string;studentDiscount:string};
const box='w-full min-w-0 rounded-2xl border border-[#dce5d9] bg-white px-4 py-3 text-[15px] text-[#1b3b30] outline-none transition focus:border-[#426b50] focus:ring-2 focus:ring-[#b5cf9a]';
const label='mb-1.5 block text-sm font-semibold text-[#254638]';
const blank:Details={ownerName:'',ownerEmail:'',ownerPhone:'',name:'',primaryCategory:'',phone:'',whatsapp:'',zone:'kesses-centre',landmark:'',address:'',latitude:'',longitude:'',tagline:'',description:'',studentDiscount:''};
const STEPS=[{title:'The essentials',hint:'Who and what'},{title:'Where & when',hint:'Location and hours'},{title:'What you offer',hint:'Pick from templates'},{title:'Photos & finish',hint:'Ready to list'}];

export function BusinessEnrollmentForm({mode='admin',onEnrolled}:{mode?:'admin'|'public';onEnrolled?:()=>void}) {
  const [step,setStep]=useState(0);
  const [details,setDetails]=useState<Details>(blank);
  const [hours,setHours]=useState<BusinessHours>(()=>hoursPreset('standard'));
  const [serviceModes,setServiceModes]=useState<string[]>(['at_shop']);
  const [products,setProducts]=useState<ProductDraft[]>([]);
  const [photos,setPhotos]=useState<string[]>([]);
  const [query,setQuery]=useState('');
  const [customHours,setCustomHours]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [locating,setLocating]=useState(false);
  const [removing,setRemoving]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [note,setNote]=useState('');
  const [variant,setVariant]=useState(0);
  const [copyEdited,setCopyEdited]=useState(false);
  const [fieldVisitConfirmed,setFieldVisitConfirmed]=useState(false);
  const [ownerConsentConfirmed,setOwnerConsentConfirmed]=useState(false);
  const [result,setResult]=useState<FormResult|null>(null);
  const [resending,setResending]=useState(false);
  const draftKey=mode==='admin'?'mm-admin-enrollment-draft-v2':'mm-public-enrollment-draft-v2';
  const lat=Number(details.latitude),lng=Number(details.longitude);
  const hasCoords=details.latitude!==''||details.longitude!=='';
  const validPin=details.latitude!==''&&details.longitude!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180;
  const selected=products.filter(p=>p.name.trim());
  const suggestions=details.primaryCategory ? templateSuggestions(details.primaryCategory,query) : [];
  const gallerySpace=Math.max(0,8-photos.length);
  const allPhotoUrls=[...photos,...products.map(item=>item.photo)].filter(Boolean);

  function field(key:keyof Details,title:string,options:React.InputHTMLAttributes<HTMLInputElement>={}) {
    return <label className="block min-w-0"><span className={label}>{title}{options.required?' *':''}</span><input {...options} value={details[key]} onChange={event=>setDetails(current=>({...current,[key]:event.target.value}))} className={box}/></label>;
  }
  function chooseCategory(value:string) {
    setDetails(current=>({...current,primaryCategory:value,tagline:'',description:''}));
    setServiceModes(enrollmentTemplate(value).modes);
    setProducts([]);
    setCopyEdited(false);
    setQuery('');
    setNote('Choose only products or services this business actually offers. Nothing is published automatically.');
  }
  function suggestCopy(nextVariant=variant) {
    const copy=suggestedEnrollmentCopy(details.primaryCategory,details.name,details.zone,selected.map(p=>p.name),nextVariant);
    setDetails(current=>({...current,...copy}));
    setVariant(nextVariant);
    setCopyEdited(false);
  }
  function addTemplate(name:string) {
    const exists=products.some(item=>item.name.toLowerCase()===name.toLowerCase());
    if(!exists&&products.length>=FREE_PRODUCT_LIMIT){setError('Free listings include five products or services. Remove one before adding another.');return;}
    const next=exists?products.filter(item=>item.name.toLowerCase()!==name.toLowerCase()):[...products,{id:crypto.randomUUID(),name,price:'',unit:'',photo:''}];
    setProducts(next);
    if(!copyEdited){
      const copy=suggestedEnrollmentCopy(details.primaryCategory,details.name,details.zone,next.map(p=>p.name),variant);
      setDetails(current=>({...current,...copy}));
    }
    setError('');
  }
  function addCustom() {
    if(products.length>=FREE_PRODUCT_LIMIT){setError('Free listings include five products or services.');return;}
    setProducts(current=>[...current,{id:crypto.randomUUID(),name:'',price:'',unit:'',photo:''}]);
  }
  function updateProduct(id:string,patch:Partial<ProductDraft>){setProducts(current=>current.map(p=>p.id===id?{...p,...patch}:p));}
  function setPeriod(days:readonly string[],key:'open'|'close'|'closed',value:string|boolean){
    setHours(current=>Object.fromEntries(ENROLLMENT_DAYS.map(day=>[day,days.includes(day)?{...current[day],[key]:value}:current[day]])) as BusinessHours);
  }
  function timeGroup(days:readonly string[],title:string) {
    const first=hours[days[0]];
    return <div className="rounded-2xl border border-[#dce5d9] bg-[#f7f9f3] p-4">
      <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-sm text-[#243c30]">{title}</strong><label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={title+' closed'} checked={!!first?.closed} onChange={event=>setPeriod(days,'closed',event.target.checked)} className="accent-[#335e41]"/> Closed</label></div>
      {!first?.closed&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label><span className={label}>Opens</span><input aria-label={title+' opening time'} type="time" className={box} value={first?.open||'08:00'} onChange={event=>setPeriod(days,'open',event.target.value)}/></label><label><span className={label}>Closes</span><input aria-label={title+' closing time'} type="time" className={box} value={first?.close||'18:00'} onChange={event=>setPeriod(days,'close',event.target.value)}/></label></div>}
    </div>;
  }
  function location() {
    if(!navigator.geolocation){setError('Your browser does not offer location access. Add a nearby landmark instead.');return;}
    setLocating(true);setError('');
    navigator.geolocation.getCurrentPosition(position=>{
      setDetails(current=>({...current,latitude:position.coords.latitude.toFixed(6),longitude:position.coords.longitude.toFixed(6)}));setLocating(false);
    },()=>{setLocating(false);setError('Location permission was denied. Use a nearby landmark, or enter coordinates.');},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  async function removePhoto(url:string) {
    setRemoving(url);setError('');
    try {
      if(allPhotoUrls.filter(item=>item===url).length<=1) {
        const response=await fetch('/api/enrollment/media?url='+encodeURIComponent(url),{method:'DELETE'});
        const data=await response.json();
        if(!response.ok) throw new Error(data.error||'Could not delete this photo');
      }
      setPhotos(current=>current.filter(item=>item!==url));
      setProducts(current=>current.map(p=>p.photo===url?{...p,photo:''}:p));
    } catch(cause){setError(cause instanceof Error?cause.message:'Photo deletion failed');}
    finally {setRemoving('');}
  }
  function saveDraft(){
    try {
      sessionStorage.setItem(draftKey,JSON.stringify({savedAt:Date.now(),details,hours,serviceModes,products,photos,step}));
      setNote('Draft saved to this tab. It is available for 24 hours.');
    } catch {setNote('This browser could not save the draft.');}
  }
  function restoreDraft(){
    try{
      const raw=sessionStorage.getItem(draftKey);
      if(!raw){setNote('No saved draft in this tab.');return;}
      const draft=JSON.parse(raw);
      if(!draft.savedAt||Date.now()-draft.savedAt>86400000){sessionStorage.removeItem(draftKey);setNote('The draft has expired.');return;}
      setDetails({...blank,...draft.details});
      if(draft.hours)setHours(draft.hours);
      if(Array.isArray(draft.serviceModes))setServiceModes(draft.serviceModes);
      if(Array.isArray(draft.products))setProducts(draft.products);
      if(Array.isArray(draft.photos))setPhotos(draft.photos);
      setStep(Math.min(3,Math.max(0,Number(draft.step)||0)));
      setNote('Draft restored. Check your photos and details before submitting.');
    } catch {setNote('The saved draft could not be restored.');}
  }
  function proceed(){
    setError('');setNote('');
    if(step===0){
      if(!details.ownerName.trim()||!details.ownerEmail.trim()||!/^\S+@\S+\.\S+$/.test(details.ownerEmail.trim())||!details.name.trim()||!details.primaryCategory||!details.phone.trim()){
        setError('Add the owner’s name, a valid email, business name, category and phone to continue.');return;
      }
    }
    if(step===1){
      if(!details.landmark.trim()&&!validPin){setError('Add a nearby landmark or select the business location on the map.');return;}
      if(hasCoords&&!validPin){setError('Complete both latitude and longitude, or clear them and use a landmark.');return;}
      if(!serviceModes.length){setError('Choose at least one service mode.');return;}
    }
    if(step===2){
      if(products.some(item=>!item.name.trim())){setError('Complete the custom item name or remove the empty item.');return;}
      if(products.some(item=>item.price!==''&&(!Number.isFinite(Number(item.price))||Number(item.price)<0))){setError('Enter valid non-negative prices.');return;}
    }
    if(step===1&&!details.description.trim()){
      const copy=suggestedEnrollmentCopy(details.primaryCategory,details.name,details.zone,selected.map(p=>p.name));
      setDetails(current=>({...current,...copy}));
    }
    setStep(current=>Math.min(3,current+1));window.scrollTo({top:0,behavior:'smooth'});
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(step!==3){proceed();return;}
    if(busy||uploading||removing)return;
    setBusy(true);setError('');
    try{
      if(!details.landmark.trim()&&!validPin)throw new Error('Add a nearby landmark or map location.');
      if(mode==='admin'&&(!fieldVisitConfirmed||!ownerConsentConfirmed))throw new Error('Confirm the field visit and the owner’s permission.');
      if(details.description.trim().length<20)throw new Error('Write at least 20 characters about this business.');
      const services=selected.map(p=>({id:p.id,name:p.name.trim(),priceFrom:p.price===''?undefined:Number(p.price),unit:p.unit.trim()||undefined,photo:p.photo||undefined}));
      const {latitude,longitude,...payload}=details;
      const response=await fetch(mode==='admin'?'/api/admin/enroll':'/api/businesses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,whatsapp:details.whatsapp.trim()||details.phone.trim(),mapPin:validPin?{lat,lng}:undefined,hours,serviceModes,services,photos,coverPhoto:photos[0]||'',fieldVisitConfirmed,ownerConsentConfirmed})});
      const data=await response.json();
      if(!response.ok||!data.business)throw new Error(data.error||'Enrollment could not be saved. Your details are still here.');
      sessionStorage.removeItem(draftKey);
      setResult(data);onEnrolled?.();
      if(mode==='public')window.dispatchEvent(new Event('mm:listing-submitted'));
      window.scrollTo({top:0,behavior:'smooth'});
    }catch(cause){setError(cause instanceof Error?cause.message:'Could not finish enrollment.');}finally{setBusy(false);}
  }
  async function resend(){
    if(!result)return;
    setResending(true);setNote('');
    try{
      const response=await fetch(mode==='admin'?'/api/admin/invitations':'/api/auth/request-link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='admin'?{businessId:result.business.id}:{email:details.ownerEmail})});
      const data=await response.json();
      if(!response.ok||data.invitation?.sent===false)throw new Error(data.error||data.invitation?.error||'Could not resend');
      setNote('Email requested. Check the owner’s inbox and spam folder.');
    }catch(cause){setNote(cause instanceof Error?cause.message:'Could not resend.');}finally{setResending(false);}
  }

  if(result) return <section aria-live="polite" className="mx-auto max-w-2xl rounded-3xl border border-[#dce5d9] bg-white p-7 text-[#243c30] shadow-sm sm:p-10">
    <CheckCircle2 size={48} className="mb-5 text-[#426b50]"/>
    <p className="text-xs font-bold uppercase tracking-[.25em] text-[#64806b]">Listing saved</p>
    <h2 className="mt-2 font-display text-3xl font-bold">{result.business.name} is on its way.</h2>
    <p className="mt-4 text-sm leading-7 text-[#607363]">{result.invitation.sent?'The invitation was sent to '+details.ownerEmail+'. The owner must accept it to manage the listing.':'The listing is saved, but the invitation was not sent. Please resend it.'} {result.business.status==='ACTIVE'?'This listing is already visible in the directory.':'The listing goes public after the administrator approves it.'} Your profile and product photos were saved with the listing.</p>
    {!result.invitation.sent&&<p role="alert" className="mt-3 rounded-xl bg-[#fff0e9] p-3 text-sm text-[#923c2c]">{result.invitation.error||'Invitation delivery unavailable'}</p>}
    {note&&<p role="status" className="mt-4 text-sm text-[#426b50]">{note}</p>}
    <div className="mt-7 flex flex-wrap gap-3">
      <button type="button" disabled={resending} onClick={()=>void resend()} className="rounded-xl border border-[#cddccd] px-5 py-3 text-sm font-semibold">{resending?'Requesting…':'Resend owner invitation'}</button>
      {mode==='admin'?<button type="button" onClick={()=>window.location.reload()} className="rounded-xl bg-[#183e35] px-5 py-3 text-sm font-semibold text-white">Enroll another business</button>:<Link href="/login" className="rounded-xl bg-[#183e35] px-5 py-3 text-sm font-semibold text-white">Go to my account</Link>}
      {result.business.status==='ACTIVE'&&<Link href={'/b/'+result.business.slug} className="rounded-xl border border-[#cddccd] px-5 py-3 text-sm font-semibold">View public page</Link>}
    </div>
  </section>;

  return <form noValidate onSubmit={submit} className="mx-auto max-w-[1080px] overflow-hidden rounded-[28px] border border-[#dce5d9] bg-white shadow-[0_20px_80px_rgba(25,62,47,.06)]">
    <div className="bg-[#193f35] px-5 pb-6 pt-7 text-white sm:px-9 sm:pt-9">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#b8d9b6]">{mode==='admin'?'Field enrollment':'List your business'} · Moi Mashinani</p><h2 className="font-display text-3xl font-semibold sm:text-4xl">A few details. Then you’re done.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#c4d8cc]">Four short steps. Pick ready-made options instead of typing everything.</p></div>
        <span className="rounded-full border border-white/20 px-4 py-2 text-xs font-bold">{step+1} / 4</span>
      </div>
      <div className="mt-7 grid grid-cols-4 gap-2">{STEPS.map((item,index)=><button key={item.title} type="button" disabled={busy||index>step} onClick={()=>{setError('');setStep(index);}} className="min-w-0 text-left disabled:cursor-default" aria-current={step===index?'step':undefined}><span className={'mb-2 block h-1.5 rounded-full '+(index<=step?'bg-[#cbef98]':'bg-white/20')}/><span className={'block truncate text-[10px] font-bold sm:text-xs '+(index===step?'text-white':'text-[#aac6b7]')}>{item.title}</span></button>)}</div>
    </div>
    <div className="px-5 pb-6 pt-7 sm:px-9 sm:pt-9">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#628a64]">Step {step+1} · {STEPS[step].hint}</p>
      {step===0&&<section className="space-y-5">
        <div><h3 className="font-display text-2xl font-semibold text-[#1d3d32]">Start with the essentials.</h3><p className="mt-1 text-sm text-[#67796b]">These five details identify the business and its owner. Everything else can be selected quickly.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">{field('ownerName','Owner’s name',{placeholder:'Full name',autoComplete:'name',required:true})}{field('ownerEmail','Owner’s email',{placeholder:'owner@example.com',type:'email',autoComplete:'email',required:true})}{field('name','Business name',{placeholder:'e.g. The Campus Wardrobe',required:true})}{field('phone','Business phone',{placeholder:'07XX XXX XXX',type:'tel',autoComplete:'tel',required:true})}</div>
        <div><span className={label}>What kind of business is this? *</span><CategorySelect value={details.primaryCategory} onChange={chooseCategory} className={box} required/><p className="mt-2 text-xs text-[#697b6d]">Choosing a type opens ready-to-use products, wording and service options.</p></div>
        <details className="rounded-2xl border border-[#e1e8db] p-4 text-sm text-[#254638]"><summary className="cursor-pointer font-semibold">More contact options (optional)</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">{field('ownerPhone','Private owner phone',{type:'tel',placeholder:'If different from shop phone'})}{field('whatsapp','Business WhatsApp',{type:'tel',placeholder:'Leave blank to use shop phone'})}</div></details>
      </section>}
      {step===1&&<section className="space-y-6">
        <div><h3 className="font-display text-2xl font-semibold text-[#1d3d32]">Where can customers find you?</h3><p className="mt-1 text-sm text-[#67796b]">A landmark <strong>or</strong> a map pin is enough. You don’t need both.</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className={label}>Campus area</span><select aria-label="Area" value={details.zone} onChange={event=>setDetails(current=>({...current,zone:event.target.value}))} className={box}>{ZONES.filter(z=>z.slug!=='all').map(z=><option key={z.slug} value={z.slug}>{z.name}</option>)}</select></label>{field('landmark','Nearby landmark (or use location)',{placeholder:'Opposite the main gate'})}</div>
        <div className="rounded-2xl border border-[#dce5d9] bg-[#f5f8f2] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="flex items-center gap-2 text-sm font-bold text-[#234738]"><MapPin size={16}/>Pin the location</p><p className="mt-1 text-xs text-[#687a6e]">Standing at the shop? Capture its coordinates in one tap.</p></div><button type="button" onClick={location} disabled={locating} className="rounded-xl bg-[#193f35] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{locating?'Locating…':'Use my location'}</button></div>
          <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-[#416a4c]">Enter coordinates manually</summary><div className="mt-3 grid grid-cols-2 gap-3">{field('latitude','Latitude',{type:'number',step:'any'})}{field('longitude','Longitude',{type:'number',step:'any'})}</div></details>
          {validPin&&<div className="mt-3 space-y-2"><div className="flex items-center gap-2 text-xs font-bold text-[#335e41]"><Check size={14}/>Location captured</div><iframe title="Business location preview" loading="lazy" className="h-44 w-full rounded-xl border border-[#dce5d9]" src={'https://www.openstreetmap.org/export/embed.html?bbox='+(lng-.003)+'%2C'+(lat-.003)+'%2C'+(lng+.003)+'%2C'+(lat+.003)+'&marker='+lat+'%2C'+lng}/></div>}
        </div>
        <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="flex items-center gap-2 text-lg font-bold text-[#1c3d31]"><Clock3 size={19}/>Opening hours</h4><span className="text-xs text-[#6a806e]">Kenya time</span></div>
          <div className="flex flex-wrap gap-2">{[['standard','Mon–Sat'],['everyday','Every day'],['late','Late hours'],['appointment','Appointment']].map(([key,text])=><button key={key} type="button" onClick={()=>{setHours(hoursPreset(key as 'standard'|'everyday'|'late'|'appointment'));setCustomHours(false);}} className="rounded-full border border-[#cfdccc] px-4 py-2 text-xs font-bold text-[#31543b] hover:bg-[#e7f1df]">{text}</button>)}</div>
          <div className="grid gap-3 md:grid-cols-3">{timeGroup(ENROLLMENT_DAYS.slice(0,5),'Monday – Friday')}{timeGroup(['Saturday'],'Saturday')}{timeGroup(['Sunday'],'Sunday')}</div>
          <button type="button" onClick={()=>setCustomHours(!customHours)} className="text-xs font-semibold text-[#426a4d] underline">{customHours?'Hide individual days':'Need different hours for specific days?'}</button>
          {customHours&&<div className="grid gap-3 sm:grid-cols-2">{ENROLLMENT_DAYS.map(day=><div key={day}>{timeGroup([day],day)}</div>)}</div>}
        </div>
        <div><p className={label}>How do customers order?</p><div className="flex flex-wrap gap-2">{[['at_shop','Visit the shop'],['comes_to_you','Home / hostel visit'],['delivery','Delivery'],['online','Online']].map(([value,text])=><button type="button" key={value} onClick={()=>setServiceModes(current=>current.includes(value)?current.filter(x=>x!==value):[...current,value])} aria-pressed={serviceModes.includes(value)} className={'rounded-full border px-4 py-2.5 text-xs font-bold transition '+(serviceModes.includes(value)?'border-[#193f35] bg-[#193f35] text-white':'border-[#d2decf] bg-white text-[#335846]')}>{serviceModes.includes(value)?'✓ ':''}{text}</button>)}</div></div>
        <details className="rounded-2xl border border-[#e1e8db] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#254638]">Extra directions (optional)</summary><div className="mt-4">{field('address','Address or directions',{placeholder:'Shop number, floor or directions'})}</div></details>
      </section>}
      {step===2&&<section className="space-y-6">
        <div><h3 className="font-display text-2xl font-semibold text-[#1d3d32]">Choose what you offer.</h3><p className="mt-1 text-sm text-[#67796b]">Tap up to five common products or services. Add anything missing. Only selected items will be listed—prices can be left blank.</p></div>
        <div className="rounded-3xl border border-[#dce5d9] bg-[#f6f9f2] p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 font-bold text-[#244b37]"><Sparkles size={18}/>Popular for {enrollmentTemplate(details.primaryCategory).title}</p><span className="rounded-full bg-[#dcebd3] px-3 py-1 text-xs font-bold text-[#335a40]">{products.length}/{FREE_PRODUCT_LIMIT} selected</span></div>
          <label className="mb-3 flex items-center gap-2 rounded-xl border border-[#d7e3d2] bg-white px-3"><Search size={17} className="text-[#69806d]"/><input aria-label="Search suggested items" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Find a product or service…" className="w-full py-3 text-sm text-[#244535] outline-none"/></label>
          <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">{suggestions.map(item=>{const checked=products.some(p=>p.name.toLowerCase()===item.name.toLowerCase());return <button type="button" key={item.name} onClick={()=>addTemplate(item.name)} aria-pressed={checked} disabled={!checked&&products.length>=FREE_PRODUCT_LIMIT} className={'rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition disabled:opacity-40 '+(checked?'border-[#193f35] bg-[#193f35] text-white':'border-[#ccdacc] bg-white text-[#365540] hover:border-[#658d63]')}>{checked?'✓ ':'+ '}{item.name}</button>;})}{suggestions.length===0&&<p className="py-4 text-xs text-[#67796b]">No template match. Add a custom item instead.</p>}</div>
        </div>
        <div className="space-y-3"><div className="flex items-center justify-between gap-3"><h4 className="text-lg font-bold text-[#213f34]">Your starting catalogue</h4><button type="button" disabled={products.length>=FREE_PRODUCT_LIMIT} onClick={addCustom} className="flex items-center gap-1 text-xs font-bold text-[#376447] disabled:opacity-40"><Plus size={16}/>Custom item</button></div>
          {products.length===0&&<div className="rounded-2xl border border-dashed border-[#cbd9c9] p-5 text-center text-sm text-[#66806a]">Choose a few suggestions above, or add your own. You can start with no products.</div>}
          {products.map((product,index)=><article key={product.id} className="rounded-2xl border border-[#dce5d9] bg-white p-4"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-[#54715c]">Item {index+1}</span><button type="button" aria-label={'Remove item '+(index+1)} onClick={()=>{if(product.photo)void removePhoto(product.photo);setProducts(current=>current.filter(item=>item.id!==product.id));}} className="text-[#a54b3d]"><Trash2 size={17}/></button></div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]"><label><span className={label}>Item name</span><input maxLength={100} aria-label={'Product '+(index+1)+' name'} value={product.name} onChange={event=>updateProduct(product.id,{name:event.target.value})} className={box}/></label><label><span className={label}>Price from · KES (optional)</span><input type="number" min="0" max="10000000" step="0.01" aria-label={'Product '+(index+1)+' price'} placeholder="Ask for price" value={product.price} onChange={event=>updateProduct(product.id,{price:event.target.value})} className={box}/></label></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><label><span className={label}>Unit (optional)</span><input maxLength={80} placeholder="per piece, kg, service…" value={product.unit} onChange={event=>updateProduct(product.id,{unit:event.target.value})} className={box}/></label><div><span className={label}>Product photo (optional)</span>{product.photo?<div className="flex items-center gap-3"><Image src={product.photo} width={76} height={64} unoptimized alt={product.name+' photo'} className="h-16 w-20 rounded-xl object-cover"/><button type="button" disabled={!!removing} onClick={()=>void removePhoto(product.photo)} className="text-xs font-bold text-[#a54b3d]">Remove photo</button></div>:<PhotoUploader enrollment label={'Upload '+(product.name||'product')+' photo'} onBusyChange={setUploading} onUploaded={urls=>updateProduct(product.id,{photo:urls[0]})} readyMessage="Attached to this item. Save the listing to publish it."/>}</div></div>
          </article>)}
        </div>
        <div className="space-y-3 rounded-2xl border border-[#dce5d9] bg-[#f7f9f4] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="flex items-center gap-2 text-lg font-bold text-[#224032]"><Sparkles size={18}/>Suggested business introduction</h4><p className="mt-1 text-xs text-[#6c806e]">Personalized using this business, its category and area. Edit freely; no unverified claims.</p></div><button type="button" onClick={()=>suggestCopy(variant+1)} className="flex items-center gap-1 rounded-xl border border-[#cbd9c6] bg-white px-3 py-2 text-xs font-bold text-[#335e41]"><RotateCw size={14}/>Another version</button></div>
          <label><span className={label}>Short tagline</span><input maxLength={160} className={box} value={details.tagline} onChange={event=>{setCopyEdited(true);setDetails(current=>({...current,tagline:event.target.value}));}}/></label>
          <label><span className={label}>Business description</span><textarea minLength={20} maxLength={3000} rows={4} className={box} value={details.description} onChange={event=>{setCopyEdited(true);setDetails(current=>({...current,description:event.target.value}));}}/></label>
          <button type="button" onClick={()=>suggestCopy(variant+1)} className="text-xs font-bold text-[#426a4d] underline">Fill from selected products</button>
        </div>
      </section>}
      {step===3&&<section className="space-y-6">
        <div><h3 className="font-display text-2xl font-semibold text-[#1d3d32]">A photo makes it real.</h3><p className="mt-1 text-sm text-[#67796b]">Add your shop, workspace or products <strong>now</strong>, before email verification. The first gallery image becomes your cover photo.</p></div>
        <div className="rounded-2xl border border-[#dce5d9] p-4 sm:p-5"><div className="mb-3 flex items-center justify-between"><h4 className="flex items-center gap-2 font-bold text-[#244535]"><Camera size={18}/>Your business gallery</h4><span className="text-xs text-[#637865]">{photos.length}/8 photos</span></div><PhotoUploader enrollment label="Business photos" multiple camera maxFiles={gallerySpace} disabled={gallerySpace===0||busy} disabledReason="Your gallery is full." onBusyChange={setUploading} onUploaded={urls=>setPhotos(current=>[...current,...urls])} readyMessage="Photos ready. They are saved with this listing when you finish."/>
          {!!photos.length&&<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo,index)=><div key={photo} className="overflow-hidden rounded-xl border border-[#dce5d9]"><Image src={photo} alt={'Business photo '+(index+1)} width={260} height={190} unoptimized className="aspect-[4/3] w-full object-cover"/><div className="flex items-center justify-between gap-2 p-2"><span className="text-[11px] font-bold text-[#365742]">{index===0?'Cover':'Photo '+(index+1)}</span><div className="flex gap-2">{index>0&&<button type="button" aria-label={'Use photo '+(index+1)+' as cover'} onClick={()=>setPhotos(current=>[photo,...current.filter(x=>x!==photo)])} className="text-[11px] font-bold text-[#335e41]">Cover</button>}<button type="button" disabled={!!removing} aria-label={'Remove business photo '+(index+1)} onClick={()=>void removePhoto(photo)} className="text-[#a54b3d]"><Trash2 size={15}/></button></div></div></div>)}</div>}
        </div>
        <div className="rounded-2xl bg-[#f3f7f0] p-5"><h4 className="mb-3 text-lg font-bold text-[#1e3c32]">Review at a glance</h4><dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-[#69816c]">Business</dt><dd className="font-semibold">{details.name}</dd></div><div><dt className="text-xs text-[#69816c]">Owner invitation</dt><dd className="break-all font-semibold">{details.ownerEmail}</dd></div><div><dt className="text-xs text-[#69816c]">Location</dt><dd className="font-semibold">{details.landmark||'Map pin selected'} · {details.zone.replaceAll('-',' ')}</dd></div><div><dt className="text-xs text-[#69816c]">Catalogue</dt><dd className="font-semibold">{selected.length} item{selected.length===1?'':'s'} · {allPhotoUrls.length} photo{allPhotoUrls.length===1?'':'s'}</dd></div></dl></div>
        <details className="rounded-2xl border border-[#e1e8db] p-4"><summary className="cursor-pointer text-sm font-semibold text-[#254638]">Optional student offer</summary><div className="mt-3">{field('studentDiscount','Student discount or special offer',{maxLength:240,placeholder:'Only if this business actually offers one'})}</div></details>
        {mode==='admin'&&<div className="space-y-3 rounded-2xl border border-[#cadbc9] p-4"><h4 className="text-sm font-bold text-[#224535]">Field verification</h4><label className="flex items-start gap-3 text-sm leading-6"><input aria-label="I personally verified the premises" type="checkbox" checked={fieldVisitConfirmed} onChange={event=>setFieldVisitConfirmed(event.target.checked)} className="mt-1 accent-[#335e41]"/><span>I visited or reliably verified the premises and confirmed the business contact details.</span></label><label className="flex items-start gap-3 text-sm leading-6"><input aria-label="Owner authorized public listing" type="checkbox" checked={ownerConsentConfirmed} onChange={event=>setOwnerConsentConfirmed(event.target.checked)} className="mt-1 accent-[#335e41]"/><span>The owner has agreed to be listed publicly and confirmed their invitation email.</span></label></div>}
        <p className="text-xs leading-6 text-[#687c70]">Free listings allow five products and 25 MB of images. Photos are stored securely and will be attached to this business. {mode==='admin'?'The business will be visible after enrollment; the owner must still accept their invitation.':'Your listing requires administrator approval; your email invitation grants account access.'}</p>
      </section>}
      {(error||note)&&<div className="mt-6 space-y-2" aria-live="polite">{error&&<p role="alert" className="rounded-xl border border-[#f4cdbf] bg-[#fff4ed] px-4 py-3 text-sm font-semibold text-[#9a4234]">{error}</p>}{note&&<p role="status" className="rounded-xl bg-[#e9f2e5] px-4 py-3 text-sm text-[#3f6d49]">{note}</p>}</div>}
    </div>
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-[#e2e9dc] bg-white/95 px-5 py-4 backdrop-blur sm:px-9">
      {step>0&&<button type="button" disabled={busy||uploading} onClick={()=>{setError('');setStep(current=>current-1);}} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#d7e3d3] px-4 text-sm font-bold text-[#254635]"><ArrowLeft size={16}/>Back</button>}
      <button type="button" onClick={saveDraft} disabled={busy} className="min-h-12 text-xs font-semibold text-[#58715e] underline">Save draft</button>
      <button type="button" onClick={restoreDraft} disabled={busy} className="min-h-12 text-xs font-semibold text-[#58715e] underline">Restore</button>
      <span className="flex-1"/>
      {step<3?<button type="button" disabled={busy||uploading} onClick={proceed} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#193f35] px-6 text-sm font-bold text-white transition hover:bg-[#2f614b] disabled:opacity-50">Continue <ArrowRight size={17}/></button>:<button type="submit" disabled={busy||uploading||!!removing||locating} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#193f35] px-6 text-sm font-bold text-white transition hover:bg-[#2f614b] disabled:opacity-50"><CheckCircle2 size={18}/>{busy?'Saving business…':mode==='admin'?'Enroll business & email owner':'Submit listing & verify email'}</button>}
    </div>
  </form>;
}
