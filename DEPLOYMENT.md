# 🚀 Render Deployment Guide

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare your production environment variables

## Deployment Steps

### 1. Connect to Render

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository containing your Solvenger backend

### 2. Configure the Service

**Service Name**: `solvenger-backend` (or your preferred name)

**Environment**: `Node`

**Build Command**: 
```bash
npm install && npm run build
```

**Start Command**: 
```bash
npm start
```

**Root Directory**: Leave empty (or specify if your backend is in a subdirectory)

### 3. Environment Variables

Set these environment variables in the Render dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `10000` | Port (Render will override this) |
| `SOLANA_RPC_URL` | `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY` | Your Helius RPC URL |
| `HELIUS_API_KEY` | `YOUR_HELIUS_API_KEY` | Your Helius API key |

### 4. Advanced Settings

**Auto-Deploy**: Enable to automatically deploy on git push

**Health Check Path**: `/api/health`

**Health Check Timeout**: `180` seconds

### 5. Deploy

Click "Create Web Service" and wait for the deployment to complete.

## Post-Deployment

### 1. Update Frontend Configuration

Update your frontend to use the new backend URL:

```javascript
// Replace localhost:3000 with your Render URL
const API_BASE_URL = 'https://your-service-name.onrender.com';
```

### 2. Test the Deployment

Test these endpoints:
- `GET /` - Root endpoint
- `GET /api/health` - Health check
- `POST /wallet/connect` - Wallet connection

### 3. Monitor Logs

Use Render's log viewer to monitor your application:
- Build logs
- Runtime logs
- Error logs

## Environment Variables Reference

### Required Variables

- `NODE_ENV`: Set to `production`
- `SOLANA_RPC_URL`: Your Solana RPC endpoint
- `HELIUS_API_KEY`: Your Helius API key for enhanced features

### Optional Variables

- `PORT`: Usually set automatically by Render
- Custom RPC endpoints for better performance

## Troubleshooting

### Common Issues

1. **Build Failures**: Check TypeScript compilation errors
2. **Runtime Errors**: Check environment variables are set correctly
3. **CORS Issues**: Verify frontend domains are in the CORS configuration
4. **Memory Issues**: Render provides 512MB RAM by default

### Health Check

Your service includes a health check endpoint:
```
GET https://your-service-name.onrender.com/api/health
```

## Security Notes

- Environment variables are encrypted in Render
- CORS is configured for production domains only
- Helmet.js provides security headers
- All API endpoints are validated with Zod schemas

## Cost Optimization

- **Free Tier**: 750 hours/month
- **Paid Plans**: Start at $7/month for always-on service
- **Auto-sleep**: Free services sleep after 15 minutes of inactivity

## Support

- Render Documentation: [docs.render.com](https://docs.render.com)
- Solvenger Backend Issues: Check your repository issues 