const fileRoute=/^\/api\/v1\/receptions\/([1-9]\d*)\/evidence\/files\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i;
export function storedPhotoPath(url,receptionId) {
    const match=typeof url==='string'&&url.match(fileRoute);
    if(!match || String(Number(match[1]))!==String(Number(receptionId)))return null;
    return url.slice('/api/v1'.length);
}
export function validatePhoto(file,description) {
    return !!file && file.size>0 && file.size<=5*1024*1024 && ['image/jpeg','image/png'].includes(file.type) &&
        (file.type==='image/png'?/\.png$/i.test(file.name):/\.jpe?g$/i.test(file.name)) && file.name.length>0 && file.name.length<=120 && !/[\x00-\x1f\x7f]/.test(file.name) &&
        typeof description==='string' && description.trim().length>0 && description.trim().length<=250 && !/[\x00-\x1f\x7f]/.test(description);
}
export async function photoIdentity(file) {
    const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
    return {name:file.name,type:file.type,size:file.size,sha256:Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')};
}
export function readPendingPhoto(storage,key) {
    try {
        const p=JSON.parse(storage.getItem(key)||'null');
        return p && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(p.requestId) &&
            /^[a-f0-9]{64}$/i.test(p.identity?.sha256) && typeof p.description==='string' ? p : null;
    } catch {return null;}
}
export function samePhoto(a,b) {return !!a&&!!b&&['name','type','size','sha256'].every(k=>a[k]===b[k]);}
