import {BaseApi} from '../../shared/infrastructure/base-api.js';
import {storedPhotoPath} from '../domain/stored-photo.js';
export class EvidenceFilesApi extends BaseApi {
    constructor(){super();this.http.defaults.timeout=30000;}
    context(id){return this.http.get(`/receptions/${id}/evidence-context`);}
    upload(id,file,description,requestId){
        const body=new FormData();body.append('file',file);body.append('description',description);body.append('requestId',requestId);
        return this.http.post(`/receptions/${id}/evidence/files`,body,{headers:{'Content-Type':undefined}});
    }
    photo(url,receptionId,signal){
        const path=storedPhotoPath(url,receptionId);
        if(!path)return Promise.reject(new Error('STORED_PHOTO_REQUIRED'));
        return this.http.get(path,{responseType:'blob',signal});
    }
}
