export class DiscrepancyCase {
    constructor({
                    id,
                    dispatchId,
                    receptionId,
                    caseNumber,
                    closedAt,
                    resolutionSummary,
                    projectName,
                    issueType,
                    status,
                    priority,
                    reportedAt,
                    description,
                    timeline,
                    responsibility,
                    missingEvidence,
                    evidences
                }) {
        this.id = id
        this.dispatchId = dispatchId
        this.receptionId = receptionId
        this.caseNumber = caseNumber
        this.closedAt = closedAt
        this.resolutionSummary = resolutionSummary
        this.projectName = projectName
        this.issueType = issueType
        this.status = status
        this.priority = priority
        this.reportedAt = reportedAt
        this.description = description
        this.timeline = timeline
        this.responsibility = responsibility
        this.missingEvidence = missingEvidence
        this.evidences = evidences
    }
}
