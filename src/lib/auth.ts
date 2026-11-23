import type { DashboardConfig } from "../types";

/* Cognito authentication using the authorization-code flow with PKCE.
 * No client secret, no stored keys. The verifier and a random state value stop
 * a login being slipped into the wrong tab. */

const store = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  del: (k: string) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function getStoredToken(): string | null {
  const expires = Number(store.get("tokenExpires"));
  return expires > Date.now() ? store.get("token") : null;
}

export function clearToken() {
  store.del("token");
  store.del("tokenExpires");
}

export async function signIn(config: DashboardConfig) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = b64url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  store.set("pkce", verifier);
  store.set("oauthState", state);
  const q = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid email",
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });
  location.assign(`${config.cognitoDomain}/oauth2/authorize?${q}`);
}

export async function finishSignIn(config: DashboardConfig): Promise<string | null> {
  const q = new URLSearchParams(location.search);
  if (!q.get("code")) return null;
  history.replaceState(null, "", location.pathname);
  if (q.get("state") !== store.get("oauthState")) {
    return "Sign-in check failed. Please try again.";
  }
  try {
    const res = await fetch(`${config.cognitoDomain}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: config.clientId,
        code: q.get("code")!,
        redirect_uri: config.redirectUri,
        code_verifier: store.get("pkce")!,
      }),
    });
    if (!res.ok) return "Sign-in failed.";
    const t = await res.json();
    store.set("token", t.access_token);
    store.set("tokenExpires", String(Date.now() + t.expires_in * 1000));
  } finally {
    store.del("pkce");
    store.del("oauthState");
  }
  return null;
}

export function signOut(config: DashboardConfig) {
  clearToken();
  location.assign(
    `${config.cognitoDomain}/logout?client_id=${config.clientId}&logout_uri=${encodeURIComponent(config.redirectUri)}`,
  );
}
