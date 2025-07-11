# Security Configuration for AnimeMuseAI

## Environment Variables

Create a `.env.local` file in your project root and add the following environment variables:

```env
# Required for Convex Auth
CONVEX_SITE_URL=http://localhost:3000

# Email configuration (for password reset emails)
EMAIL_SERVICE_API_KEY=your_email_service_api_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Optional: OAuth providers (uncomment to enable)
# GOOGLE_CLIENT_ID=your_google_client_id
# GOOGLE_CLIENT_SECRET=your_google_client_secret
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret

# Security settings
SESSION_SECRET=your_session_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here

# Rate limiting
RATE_LIMIT_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000

# Two-factor authentication
TOTP_ISSUER_NAME=AnimeMuseAI
```

## Security Features Implemented

### 1. **Enhanced Password Security**
- ✅ Strong password requirements (8+ chars, mixed case, numbers, special chars)
- ✅ Real-time password strength validation
- ✅ Protection against common passwords
- ✅ Secure password hashing with bcrypt

### 2. **Rate Limiting & Brute Force Protection**
- ✅ Configurable attempt limits (default: 5 attempts)
- ✅ Time-based lockouts (default: 15 minutes)
- ✅ IP-based and email-based tracking
- ✅ Visual feedback to users about remaining attempts

### 3. **Session Management**
- ✅ Secure session tokens
- ✅ Session expiration (30 days total, 7 days inactive)
- ✅ Device/browser tracking
- ✅ Session revocation capabilities
- ✅ Multi-device session monitoring

### 4. **Two-Factor Authentication (2FA)**
- ✅ TOTP-based authentication (Google Authenticator, Authy)
- ✅ QR code setup for easy configuration
- ✅ Backup codes for account recovery
- ✅ Secure secret generation

### 5. **Account Security**
- ✅ Email validation with real-time feedback
- ✅ Password reset functionality
- ✅ Security event logging
- ✅ Account lockout for suspicious activity

### 6. **User Interface Improvements**
- ✅ Modern, responsive design
- ✅ Progressive disclosure of complexity
- ✅ Clear visual feedback for security states
- ✅ Accessible form controls

### 7. **Privacy & Data Protection**
- ✅ Terms of service acknowledgment
- ✅ Privacy policy compliance
- ✅ Secure data transmission
- ✅ Minimal data collection

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install bcryptjs speakeasy qrcode
   npm install --save-dev @types/bcryptjs @types/speakeasy @types/qrcode
   ```

2. **Configure Environment Variables**
   - Copy the environment variables above to your `.env.local` file
   - Generate secure values for SESSION_SECRET and ENCRYPTION_KEY
   - Configure email service for password reset functionality

3. **Update Convex Schema**
   - The enhanced security tables are already added to `convex/schema.ts`
   - Run `npx convex dev` to apply schema changes

4. **Deploy Security Functions**
   - All security functions are in `convex/authSecurity.ts`
   - Password reset functions are in `convex/passwordReset.ts`

5. **Use Enhanced Components**
   - Replace the default sign-in form with `EnhancedSignInForm`
   - Add `SecuritySettings` component to user dashboard
   - Integrate `TwoFactorSetup` for 2FA enrollment

## Security Best Practices

### For Development
- Use strong, unique secrets for all environment variables
- Enable HTTPS in production
- Regularly update dependencies
- Monitor security logs

### For Production
- Use environment-specific secrets
- Enable rate limiting on your hosting platform
- Set up monitoring and alerting
- Implement email service for password resets
- Configure OAuth providers if desired

### For Users
- Encourage strong passwords
- Promote 2FA adoption
- Provide clear security settings
- Monitor for suspicious activity

## API Integration

The enhanced authentication system integrates seamlessly with your existing Convex setup:

```typescript
// Check if user is authenticated with enhanced security
const user = useQuery(api.auth.loggedInUser);
const rateLimitStatus = useQuery(api.authSecurity.checkRateLimit, {
  identifier: email,
  attemptType: "login"
});

// Set up two-factor authentication
const setupTwoFactor = useMutation(api.authSecurity.setupTwoFactor);

// Manage user sessions
const sessions = useQuery(api.authSecurity.getActiveSessions);
const revokeSession = useMutation(api.authSecurity.revokeSession);
```

## Testing

Test the security features:

1. **Password Strength**: Try various password combinations
2. **Rate Limiting**: Attempt multiple failed logins
3. **2FA Setup**: Complete the two-factor setup flow
4. **Session Management**: View and revoke active sessions
5. **Password Reset**: Test the password reset workflow

## Support

If you encounter any issues with the security implementation:

1. Check the browser console for detailed error messages
2. Verify environment variables are correctly set
3. Ensure Convex schema is up to date
4. Review the security logs for debugging information

The enhanced authentication system provides enterprise-grade security while maintaining a smooth user experience. All security features are optional and can be gradually enabled based on your needs.
