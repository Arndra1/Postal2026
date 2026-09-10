import { getAccessToken } from '@base44/sdk';

const isNode = typeof window === 'undefined';

const isClearAccessTokenRequested = () =>
	!isNode && new URLSearchParams(window.location.search).get("clear_access_token") === 'true';

const clearStoredAccessToken = () => {
	window.localStorage.removeItem('base44_access_token');
	window.localStorage.removeItem('token');
}

// Session-based auth: discard any token persisted from a previous browser
// session so every account (customer, admin, owner) must sign in again after
// closing the app/browser. sessionStorage is scoped to the tab and cleared
// automatically when the browser closes, so a refresh within the same
// session keeps the flag (and the token) intact — only a fresh open clears.
const enforceSessionBoundary = () => {
	if (isNode || !window.sessionStorage) return;
	const SESSION_FLAG = 'base44_session_active';
	if (!window.sessionStorage.getItem(SESSION_FLAG)) {
		clearStoredAccessToken();
		window.sessionStorage.setItem(SESSION_FLAG, '1');
	}
};

const getAppParams = () => {
	enforceSessionBoundary();
	if (isClearAccessTokenRequested()) {
		clearStoredAccessToken();
	}
	return {
		appId: import.meta.env.VITE_BASE44_APP_ID,
		token: getAccessToken(),
		functionsVersion: import.meta.env.VITE_BASE44_FUNCTIONS_VERSION,
		appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
	}
}


export const appParams = {
	...getAppParams()
}