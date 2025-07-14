# AnimeMuseAI Deployment Guide

## Quick Fix for Auth Issues

Your app has two Convex deployments:
- **Development**: `https://academic-mammoth-217.convex.cloud`
- **Production**: `https://glad-wolf-707.convex.cloud`

### Vercel Environment Variables Required

Make sure these are set in your Vercel project settings:

```bash
VITE_CONVEX_URL=https://glad-wolf-707.convex.cloud
```

### Convex Production Environment Variables Set ✅

The following are already configured in your production deployment:

```bash
AUTH_PRIVATE_KEY=RlHv1RZ6D/AqIjCWtvK1TRw/ok0WsTMbjSanfT2rAA8Aa8=
JWKS={"keys":[{"use":"sig","e":"AQAB","kty":"RSA","n":"lPS-6sAZJWq18OyjNkmDCWkByDe-Avkju-tlcIXVdXkRS-H-JtsfbPbDfZ1PBBbmcWP61go-8SVsLcGeplb1bt7o2Lmp57VAB5B0fxImKnw0rb62J5uY8VjZ4jxM0ALvgRW1goexdohTG9cSFsaSyVZnIuNiiR1I8NmCkilFo6Km-Xp04s64Y3A_sriOjaTFnM4Ru8OozOW8k_KN8ubyKYOHgWggNwySQFVmfNLW5bSSjSVUOVUhIh4x5odCacSy3xR4ukuiOl5WGTZwPqfAA_7kM_5ZSSqrtElOFU8Anzlpx7ZKIYwRgShNuAHu1lkDSfMGhCCE7QdWBP-2Vgf9wvQ"}]}
SITE_URL=https://animuseai.vercel.app
VITE_CONVEX_URL=https://glad-wolf-707.convex.cloud
CONVEX_OPENAI_API_KEY=[configured]
TWILIO_ACCOUNT_SID=[configured]
TWILIO_AUTH_TOKEN=[configured]
TWILIO_PHONE_NUMBER=[configured]
```

## Deployment Commands

### Deploy Backend to Production
```bash
npx convex deploy
```

### Deploy Frontend to Vercel
Your frontend is automatically deployed when you push to your main branch.

## Troubleshooting

### If anonymous sign-in still fails:

1. **Check Vercel Environment Variables**: Make sure `VITE_CONVEX_URL` is set to your production URL
2. **Redeploy Frontend**: Push a commit to trigger a new Vercel deployment
3. **Check Browser Console**: Look for any other error messages
4. **Test Production Convex**: Try calling functions directly from the Convex dashboard

### Verify Deployment Status
```bash
# Check production environment
npx convex env list --prod

# Test a query in production
npx convex run --prod auth:signIn --help
```

## Next Steps

1. Go to your Vercel dashboard
2. Set the environment variable `VITE_CONVEX_URL=https://glad-wolf-707.convex.cloud`
3. Trigger a new deployment
4. Test anonymous sign-in on your live site

The authentication should now work correctly!
