export function readDeparture(storage,key) {
    try {
        const plan=JSON.parse(storage.getItem(key)||'null');
        return plan && /^[0-9a-f-]{36}$/i.test(plan.requestId) && validDeparture(plan) ? plan : null;
    } catch { return null; }
}
export function validDeparture(plan) {
    return Number.isInteger(Number(plan.originGeofenceId)) && Number(plan.originGeofenceId)>0 &&
        Number.isFinite(Date.parse(plan.estimatedArrival)) && Array.isArray(plan.plannedPath) && plan.plannedPath.length>=2 && plan.plannedPath.length<=500 &&
        plan.plannedPath.every(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180);
}
