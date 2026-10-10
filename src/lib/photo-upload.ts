export type PhotoUploadItem = {name:string;stage:'pending'|'preparing'|'uploading'|'processing'|'done'|'failed';progress:number;reason?:string};
export type PhotoUploadOptions = {onChange?:(items:PhotoUploadItem[])=>void;signal?:AbortSignal};

/** Resize before transport so 5 MB source images fit serverless request limits. */
async function compressPhoto(file: File): Promise<File> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Unsupported format. Choose a JPG, PNG or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('This image exceeds 5 MB. Choose a smaller image.');
  if (!file.size) throw new Error('This file is empty. Choose another image.');
  let bitmap:ImageBitmap;
  try {bitmap=await createImageBitmap(file);} catch {throw new Error('This image could not be read. It may be damaged; choose another image.');}
  try {
    if (bitmap.width * bitmap.height > 25000000) throw new Error('Use an image under 25 megapixels.');
    const canvas = document.createElement('canvas');
    let blob: Blob | null = null;
    for (const [dimension,quality] of [[1600,0.82],[1200,0.65]] as const) {
      const ratio = Math.min(1,dimension/bitmap.width,dimension/bitmap.height);
      canvas.width = Math.max(1,Math.round(bitmap.width*ratio));canvas.height = Math.max(1,Math.round(bitmap.height*ratio));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo processing is unavailable. Try another browser.');
      context.drawImage(bitmap,0,0,canvas.width,canvas.height);
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve,'image/webp',quality));
      if (blob && blob.size <= 1024 * 1024) break;
    }
    if (!blob || blob.size > 1024 * 1024) throw new Error('Reduce this image’s dimensions and try again.');
    return new File([blob],`${file.name.replace(/\.[^.]+$/,'')}.webp`,{type:blob.type});
  } finally {bitmap.close();}
}

function sendBatch(body:FormData,onProgress:(percentage:number)=>void,onProcessing:()=>void,signal?:AbortSignal):Promise<string[]> {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    const abort=()=>xhr.abort();
    const finish=()=>signal?.removeEventListener('abort',abort);
    xhr.open('POST','/api/uploads');xhr.timeout=90000;
    xhr.upload.onprogress=event=>{if(event.lengthComputable)onProgress(Math.round(event.loaded/event.total*100));};
    xhr.upload.onload=onProcessing;
    xhr.onload=()=>{
      finish();let data:{photos?:unknown;error?:string}={};
      try {const parsed:unknown=JSON.parse(xhr.responseText);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))data=parsed as typeof data;} catch { /* Some hosts return HTML errors. */ }
      if(xhr.status>=200&&xhr.status<300&&Array.isArray(data.photos)&&data.photos.every(photo=>typeof photo==='string'))resolve(data.photos);
      else reject(new Error(data.error || (xhr.status===413?'The upload is too large. Choose fewer or smaller photos.':xhr.status===401?'Your session has ended. Sign in again, then retry.':xhr.status===429?'Too many uploads. Wait a few minutes, then retry.':'The server could not upload these photos. Please retry.')));
    };
    xhr.onerror=()=>{finish();reject(new Error('Connection lost. Check your internet connection, then retry.'));};
    xhr.ontimeout=()=>{finish();reject(new Error('The upload timed out. Check your connection and retry with fewer photos.'));};
    xhr.onabort=()=>{finish();reject(new Error('Upload cancelled. No photos were added to your listing.'));};
    if(signal?.aborted){reject(new Error('Upload cancelled.'));return;}
    signal?.addEventListener('abort',abort,{once:true});xhr.send(body);
  });
}

export async function uploadBusinessPhotos(files: File[], businessId?: string, options:PhotoUploadOptions={}): Promise<string[]> {
  if (!files.length || files.length > 8) throw new Error('Choose one to eight photos at a time.');
  let items:PhotoUploadItem[]=files.map(file=>({name:file.name,stage:'pending',progress:0}));
  const emit=()=>options.onChange?.(items.map(item=>({...item})));
  const update=(indices:number[],values:Partial<PhotoUploadItem>)=>{items=items.map((item,i)=>indices.includes(i)?{...item,...values}:item);emit();};
  emit();const prepared:File[]=[];const photos:string[]=[];
  try {
    for(const [i,file] of files.entries()) {
      options.signal?.throwIfAborted();update([i],{stage:'preparing'});
      try {prepared.push(await compressPhoto(file));update([i],{stage:'pending'});} catch(error){throw new Error(`${file.name}: ${error instanceof Error?error.message:'Image processing failed.'}`);}
    }
    for (let i=0;i<prepared.length;i+=3) {
      options.signal?.throwIfAborted();const batch=prepared.slice(i,i+3);const indices=batch.map((_,offset)=>i+offset);
      const body = new FormData();batch.forEach(file => body.append('files',file));
      if (businessId) body.append('businessId',businessId);
      update(indices,{stage:'uploading',progress:0});
      const urls=await sendBatch(body,progress=>update(indices,{progress}),()=>update(indices,{stage:'processing',progress:100}),options.signal);
      photos.push(...urls);
      if(urls.length!==batch.length)throw new Error('The server returned an incomplete upload. Please retry.');
      update(indices,{stage:'done',progress:100});
    }
    return photos;
  } catch (error) {
    const reason=options.signal?.aborted?'Upload cancelled. No photos were added to your listing.':error instanceof Error?error.message:'Photo upload failed. Please retry.';
    update(files.map((_,i)=>i),{stage:'failed',reason});
    // Unreferenced assets are also retried by scheduled cleanup if deletion is unavailable.
    await Promise.allSettled(photos.map(url => fetch(`/api/uploads?url=${encodeURIComponent(url)}`,{method:'DELETE',signal:AbortSignal.timeout(5000)})));
    throw new Error(reason);
  }
}
