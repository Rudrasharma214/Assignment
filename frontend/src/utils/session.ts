const SESSION_ID_KEY = 'student_session_id';
const STUDENT_NAME_KEY = 'student_name';


export function getOrCreateStudentSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

    if (!sessionId) {
        sessionId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }

    return sessionId;
}

export function clearStudentSession(): void {
    sessionStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(STUDENT_NAME_KEY);
}

export function hasStudentSession(): boolean {
    return !!sessionStorage.getItem(SESSION_ID_KEY);
}

export function setStudentName(name: string): void {
    sessionStorage.setItem(STUDENT_NAME_KEY, name);
}

export function getStudentName(): string | null {
    return sessionStorage.getItem(STUDENT_NAME_KEY);
}

export function hasStudentName(): boolean {
    return !!sessionStorage.getItem(STUDENT_NAME_KEY);
}
