/* Delivery Exception Monitor – configuration.
 *
 * Two modes, chosen by this one file:
 *
 * 1. SAMPLE MODE (default): with DASH_CONFIG left undefined, the console runs
 *    entirely on realistic sample data that mirrors the corridor. Nothing
 *    leaves the browser. This is what you see when you open the built site.
 *
 * 2. LIVE MODE: when DASH_CONFIG is defined below, the console talks to your
 *    deployed monitor API and signs people in with Cognito (authorization code
 *    flow with PKCE – no client secret, no stored keys).
 *
 * Fill in the values from your deployment and redeploy. Leave the object
 * undefined to stay in sample mode.
 */
window.DASH_CONFIG = undefined;

/* Example live configuration:
window.DASH_CONFIG = {
  apiUrl: "https://abc123.execute-api.af-south-1.amazonaws.com",
  cognitoDomain: "https://your-app.auth.af-south-1.amazoncognito.com",
  clientId: "your-cognito-app-client-id",
  redirectUri: "https://your-bucket.s3.af-south-1.amazonaws.com/"
};
*/
