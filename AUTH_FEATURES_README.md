# Enhanced Authentication System

This update adds Google OAuth authentication via Auth0 and replaces phone verification with email/OTP verification featuring a brutalist UI design.

## New Features

### 🔐 Google Authentication (Auth0)
- **Google Sign In/Sign Up**: Users can now authenticate using their Google accounts
- **Auth0 Integration**: Secure OAuth flow via Auth0 service
- **Seamless Experience**: One-click authentication with Google

### 📧 Email/OTP Verification
- **Dual Verification**: Support for both email and SMS verification
- **User Choice**: Users can choose between email or phone verification
- **Brutalist UI**: Artistic, bold interface with geometric shapes and high contrast
- **Modern Design**: Angular shapes, bold typography, and vibrant colors

### 🎨 Brutalist UI Design
- **Geometric Elements**: Dynamic geometric shapes as background elements
- **Bold Typography**: Heavy, impactful fonts with high contrast
- **Angular Design**: Sharp edges, bold borders, and dramatic shadows
- **Interactive Elements**: Hover effects and animations

## Setup Instructions

### Auth0 Configuration

1. **Create Auth0 Account**
   - Go to [auth0.com](https://auth0.com) and create an account
   - Create a new application (Single Page Application)

2. **Configure Google Connection**
   - In Auth0 dashboard, go to Authentication > Social
   - Enable Google and configure with your Google OAuth credentials

3. **Environment Variables**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Add your Auth0 credentials
   REACT_APP_AUTH0_DOMAIN=your-auth0-domain.auth0.com
   REACT_APP_AUTH0_CLIENT_ID=your-auth0-client-id
   ```

4. **Auth0 Settings**
   - **Allowed Callback URLs**: `http://localhost:3000/callback, https://yourdomain.com/callback`
   - **Allowed Web Origins**: `http://localhost:3000, https://yourdomain.com`
   - **Allowed Logout URLs**: `http://localhost:3000, https://yourdomain.com`

### Database Schema Updates

The following tables have been added/updated:

```typescript
// New email verification table
emailVerifications: {
  email: string,
  userId: Id<"users">,
  hashedCode: string,
  expiresAt: number,
  attempts?: number,
  requestedAt?: number,
}

// Updated user profiles
userProfiles: {
  // ... existing fields
  email?: string,           // NEW
  emailVerified?: boolean,  // NEW
}
```

## Usage

### For Users

1. **Sign In Options**:
   - Traditional email/password
   - Google OAuth (one-click)
   - Anonymous beta access

2. **Verification Process**:
   - Choose between email or SMS verification
   - Receive 6-digit code
   - Enter code to verify account

3. **Security Features**:
   - Rate limiting (3 attempts per minute)
   - Code expiration (10 minutes)
   - Maximum 5 attempts per code

### For Developers

1. **Email Verification**:
   ```typescript
   // Request verification code
   const result = await requestEmailVerificationCode({ email });
   
   // Submit verification code
   const result = await submitEmailVerificationCode({ code });
   ```

2. **Phone Verification** (existing):
   ```typescript
   // Request SMS code
   const result = await requestSmsVerificationCode({ phoneNumber });
   
   // Submit SMS code  
   const result = await submitSmsVerificationCode({ code });
   ```

3. **Google Authentication**:
   ```typescript
   const { signInWithGoogle, signUpWithGoogle } = useAuth0Google();
   
   // Trigger Google sign in
   await signInWithGoogle();
   ```

## Security Features

- **Rate Limiting**: Prevents spam verification requests
- **Code Hashing**: Verification codes are hashed before storage
- **Expiration**: All codes expire after 10 minutes
- **Attempt Limiting**: Maximum 5 attempts per verification code
- **Secure Validation**: Multiple validation layers for security

## UI Components

### VerificationPrompt
A brutalist-styled verification component supporting both email and phone verification:
- Dynamic geometric background
- Toggle between verification methods
- Real-time validation
- Modern, artistic design

### EnhancedSignInForm
Updated with Google authentication:
- Google sign in/up buttons
- Consistent brutalist styling
- Enhanced user experience

## File Structure

```
src/
├── components/auth/
│   ├── VerificationPrompt.tsx     # New brutalist verification UI
│   ├── EnhancedSignInForm.tsx     # Updated with Google auth
│   └── Auth0Callback.tsx          # Handles Auth0 redirects
├── hooks/
│   └── useAuth0Google.ts          # Google OAuth hook
└── lib/
    └── auth0Config.ts             # Auth0 configuration

convex/
└── emailVerification.ts           # Email verification logic
```

## Testing

1. **Email Verification**:
   - Enter email address
   - Check console for verification code (development)
   - Enter code to verify

2. **Google Authentication**:
   - Click "Google Sign In/Up"
   - Complete Google OAuth flow
   - Return to application

3. **Brutalist UI**:
   - Verify geometric shapes animate
   - Check responsive design
   - Test hover effects

## Production Considerations

1. **Email Service**: Replace console logging with actual email service (SendGrid, AWS SES, etc.)
2. **Auth0 Production**: Configure production domains and settings
3. **Error Handling**: Add comprehensive error handling for production
4. **Analytics**: Track authentication success/failure rates
5. **Performance**: Optimize background animations for mobile devices

## Troubleshooting

### Common Issues

1. **Auth0 Configuration Error**:
   - Verify domain and client ID in `.env`
   - Check Auth0 application settings
   - Ensure Google connection is configured

2. **Email Verification Not Working**:
   - Check console for verification codes (development)
   - Verify email format validation
   - Check rate limiting settings

3. **Brutalist UI Issues**:
   - Ensure all CSS imports are working
   - Check for z-index conflicts
   - Verify responsive design

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'auth:*');
```

## Future Enhancements

- [ ] Additional OAuth providers (GitHub, Discord, etc.)
- [ ] Two-factor authentication integration
- [ ] Biometric authentication support
- [ ] Enhanced brutalist animations
- [ ] Email template customization
- [ ] Advanced security features

---

For support or questions, please check the documentation or create an issue in the repository.
