import {storedPhotoPath} from '../domain/stored-photo.js';
import { BaseApi } from '../../shared/infrastructure/base-api.js'
import { BaseEndpoint } from '../../shared/infrastructure/base-endpoint.js'
import { DiscrepancyCaseAssembler } from './discrepancy-case.assembler.js'

const discrepancyCasesEndpointPath = import.meta.env.VITE_DISCREPANCY_CASES_ENDPOINT_PATH || '/discrepancy-cases'

export class DiscrepancyApi extends BaseApi {
    #casesEndpoint

    constructor() {
        super()
        this.http.defaults.timeout = 30000
        this.#casesEndpoint = new BaseEndpoint(this, discrepancyCasesEndpointPath)
    }

    async getAllCases() {
        const response = await this.#casesEndpoint.getAll()

        const resources = await Promise.all(response.data.map(async item => {
            const reception = await this.http.get(`${discrepancyCasesEndpointPath}/${item.id}/reception`).then(r=>r.data).catch(error=>{if(error.response?.status===404)return null;throw error;});
            const timeline = (await this.http.get(`${discrepancyCasesEndpointPath}/${item.id}/timeline`)).data;
            return {...item, projectName: reception?.siteName || '', issueType: reception?.items?.some(i => i.hasDiscrepancy) ? 'Quantity mismatch' : 'Damaged materials',
                priority: ({Critical: 'High', Major: 'Medium', Minor: 'Low'})[reception?.discrepancy?.severity] || 'Medium', reportedAt: item.openedAt,
                description: reception?.discrepancy?.description || item.resolutionSummary || '', timeline,
                missingEvidence: reception?.evidences?.some(e=>storedPhotoPath(e.fileUrl,item.receptionId)) ? [] : ['Transport photographic evidence'],
                evidences: (reception?.evidences || []).map(e => ({...e, evidenceUrl: e.fileUrl, caption: e.description, capturedAt: e.attachedAt, type: 'Photo'}))};
        }));
        return DiscrepancyCaseAssembler.toEntities(resources)
    }

    async generateSupportingReport(caseId) {
        const response = await this.http.get(`${discrepancyCasesEndpointPath}/${caseId}/report`, {responseType: 'blob'});
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `discrepancy-case-${caseId}-report.pdf`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return {
            caseId: caseId,
            fileName: `discrepancy-case-${caseId}-report.pdf`,
            generated: true
        }
    }

    async determineResponsibility(caseId, responsibility) {
        const response = await this.http.patch(`${discrepancyCasesEndpointPath}/${caseId}`, { responsibility })

        return {
            caseId: caseId,
            responsibility: response.data.responsibility,
            updated: true
        }
    }

    async closeCase(caseId) {
        const response = await this.http.patch(`${discrepancyCasesEndpointPath}/${caseId}`, { status: 'Closed' })

        return {
            caseId: caseId,
            status: response.data.status,
            closed: true
        }
    }
}
