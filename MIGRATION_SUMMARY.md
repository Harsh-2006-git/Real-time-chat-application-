# Migration Summary: Single-Port Architecture for Vercel

## What Changed

### ✅ Removed
- `src/server/socket.js` - Separate Socket.io server on port 3001
- `server.js` - Custom Next.js server (no longer needed for Vercel)

### ✅ Added
- `pages/api/socket.js` - Socket.io API route using Pages Router
- `vercel.json` - Vercel configuration
- `DEPLOYMENT.md` - Comprehensive deployment guide

### ✅ Modified
- `src/context/SocketContext.js` - Updated to connect to `/api/socket` path
- `package.json` - Changed dev script from `node server.js` to `next dev`
- `README.md` - Updated with deployment instructions

## Architecture Overview

### Before (Two Ports)
```
Port 3000: Next.js App
Port 3001: Socket.io Server (separate)
```

### After (Single Port)
```
Port 3000: 
  ├── Next.js App
  └── /api/socket → Socket.io WebSocket endpoint
```

## How It Works

1. **Development**: 
   - Run `npm run dev`
   - Next.js starts on port 3000
   - Socket.io API route is available at `http://localhost:3000/api/socket`

2. **Production (Vercel)**:
   - Deploy to Vercel
   - Everything runs on your Vercel domain
   - Socket.io available at `https://your-app.vercel.app/api/socket`

## Key Technical Details

### Pages Router for Socket.io
Socket.io requires access to the Node.js HTTP server, which is only available in the Pages Router (`pages/api/*`), not the App Router (`src/app/api/*`).

### Client Connection
```javascript
const socket = io({
    path: "/api/socket",
});
```

### Serverless Compatibility
The Socket.io handler:
- Initializes once per serverless function instance
- Stores the `io` instance on `res.socket.server.io`
- Reuses the same instance for subsequent requests
- Maintains user connections in a Map

## Testing Checklist

- [ ] Development server starts successfully
- [ ] Socket.io connects at `/api/socket`
- [ ] Messages send/receive in real-time
- [ ] User online/offline status updates
- [ ] Typing indicators work
- [ ] Message edit/delete works
- [ ] Production build succeeds (`npm run build`)
- [ ] Vercel deployment successful
- [ ] Socket.io works on Vercel

## Environment Variables for Vercel

Required in Vercel dashboard:
```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

## Limitations & Considerations

1. **Vercel Free Tier**: WebSocket connections may timeout after 5 minutes
2. **Scaling**: Vercel's serverless functions are stateless; for production at scale, consider:
   - Redis adapter for Socket.io
   - Dedicated WebSocket server (e.g., Railway, Render)
3. **Cold Starts**: First connection may be slower due to serverless cold starts

## Next Steps

1. Test locally: `npm run dev`
2. Build: `npm run build`
3. Push to Git
4. Deploy to Vercel
5. Add environment variables
6. Test on production

## Rollback Plan

If you need to rollback to the two-server setup:
1. Restore `server.js` and `src/server/socket.js`
2. Change `package.json` dev script back to `node server.js`
3. Update `SocketContext.js` to connect to `http://localhost:3001`

---

**Status**: ✅ Ready for Vercel deployment
**Date**: 2025-12-31
