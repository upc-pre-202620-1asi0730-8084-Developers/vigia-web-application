const sessionKey = 'vigia.session';

export function readSession() {
    try {
        const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
        if (session?.token && session.expiresAt > Date.now()) return session;
    } catch {}
    sessionStorage.removeItem(sessionKey);
    return null;
}

export function saveSession(session) {
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
    sessionStorage.removeItem(sessionKey);
}
