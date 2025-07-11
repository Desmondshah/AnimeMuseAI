// src/hooks/useAuth0Google.ts
import { toast } from 'sonner';
import { auth0Config } from '../lib/auth0Config';

export const useAuth0Google = () => {
  const signInWithGoogle = async () => {
    try {
      const { domain, clientId, redirectUri } = auth0Config;
      
      const authUrl = new URL(`https://${domain}/authorize`);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', 'openid profile email');
      authUrl.searchParams.append('connection', 'google-oauth2');
      authUrl.searchParams.append('prompt', 'select_account');
      
      // Store the current page for potential redirect back
      sessionStorage.setItem('auth0_redirect_intent', 'signin');
      
      window.location.href = authUrl.toString();
    } catch (err: any) {
      console.error('Google Auth0 Sign In Error:', err);
      toast.error('Failed to sign in with Google. Please try again.');
    }
  };

  const signUpWithGoogle = async () => {
    try {
      const { domain, clientId, redirectUri } = auth0Config;
      
      const authUrl = new URL(`https://${domain}/authorize`);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('scope', 'openid profile email');
      authUrl.searchParams.append('connection', 'google-oauth2');
      authUrl.searchParams.append('prompt', 'select_account');
      authUrl.searchParams.append('screen_hint', 'signup');
      
      // Store the current page for potential redirect back
      sessionStorage.setItem('auth0_redirect_intent', 'signup');
      
      window.location.href = authUrl.toString();
    } catch (err: any) {
      console.error('Google Auth0 Sign Up Error:', err);
      toast.error('Failed to sign up with Google. Please try again.');
    }
  };

  return {
    signInWithGoogle,
    signUpWithGoogle,
    isLoading: false,
    error: null,
  };
};
