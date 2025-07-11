// src/lib/auth0Config.ts
export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN || 'your-auth0-domain.auth0.com',
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID || 'your-auth0-client-id',
  redirectUri: window.location.origin + '/callback',
  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  scope: 'openid profile email',
};

export const googleConnection = 'google-oauth2';
