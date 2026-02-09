# Deployment Guide for WeChat Access

## 🎯 Goal
Deploy Sales Agent so your team can access it via WeChat (微信) with persistent data storage.

## 💰 Recommended Solution: Railway.app (Free Tier with Persistent Storage)

### What You Get (Free)
- **Web Dashboard**: HTTPS URL accessible from WeChat
- **API Server**: Backend with SQLite database
- **Persistent Storage**: 5GB free disk space for database
- **Auto-deploy**: From GitHub
- **Custom Domain**: Support for your own domain

### Estimated Cost
- **Free tier**: $0/month (includes 5GB storage + $5 credits monthly)
- **Starter plan**: $5/month (if you exceed free credits)

---

## 📋 Step-by-Step Deployment on Railway

### Step 1: Push to GitHub

From the `sales-agent` folder:

```bash
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/sales-agent.git
git push -u origin main
```

> **Note**: Replace `YOUR_USERNAME` with your actual GitHub username.

---

### Step 2: Sign Up on Railway

1. Go to [railway.app](https://railway.app)
2. Click **"Start a New Project"**
3. Choose **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub account
5. Select your `sales-agent` repository

---

### Step 3: Configure the API Service

The project includes a `railway.json` config file that should auto-configure most settings. Railway should auto-detect your Node.js project.

#### Basic Settings:
- **Name**: `sales-agent-api`
- **Root Directory**: `/` (leave empty or set to project root)
- **Build Command**: `npm install && npm run build` (auto-detected from railway.json)
- **Start Command**: `npm run start:server` (auto-detected from railway.json)
- **Healthcheck Path**: `/health`

#### Environment Variables:
Click **"Variables"** tab, then add:

```
NODE_ENV=production
PORT=3000
DATA_DIR=/app/data
```

> **Note**: Click "Add" for each variable, then click "Deploy" to apply changes.

> **Railway.json Config**: The root `railway.json` file contains:
> ```json
> {
>   "$schema": "https://railway.app/railway.schema.json",
>   "build": {
>     "builder": "NIXPACKS",
>     "buildCommand": "npm install && npm run build"
>   },
>   "deploy": {
>     "startCommand": "npm run start:server",
>     "healthcheckPath": "/health",
>     "healthcheckTimeout": 30,
>     "restartPolicyType": "ON_FAILURE",
>     "restartPolicyMaxRetries": 10
>   }
> }
> ```

---

### Step 4: Add Persistent Storage (Volume)

This is crucial for keeping your data!

1. In your service dashboard, click **"Volumes"** tab
2. Click **"New Volume"**
3. Configure:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB (you can increase up to 5GB on free tier)
4. Click **"Create"**

Your SQLite database will be stored at `/app/data/sales-agent.db`

---

### Step 5: Deploy the Web Dashboard

Now deploy the React frontend as a separate service:

1. In your Railway project, click **"New"** → **"Service"** → **"GitHub Repo"**
2. Select the same `sales-agent` repo again
3. Configure:
   - **Name**: `sales-agent-web`
   - **Root Directory**: `web` (important!)
   - **Build Command**: `npm install && npm run build` (from `web/railway.toml`)
   - **Start Command**: `npx serve -s dist -l 3000` (from `web/railway.toml`)

> **Web Railway.toml Config**: The `web/railway.toml` file contains:
> ```toml
> [build]
> builder = "NIXPACKS"
> buildCommand = "npm install && npm run build"
>
> [deploy]
> startCommand = "npx serve -s dist -l 3000"
> ```

#### Alternative: Deploy as Static Site
Railway may auto-detect it as a static site. If so:
- Set **Publish Directory**: `dist`

#### Environment Variables for Web:
```
VITE_API_URL=https://your-api-service-url.railway.app/api
```

> **Note**: Get your API URL from the `sales-agent-api` service (click on it, copy the URL)

---

### Step 6: Update CORS Settings

After getting your web dashboard URL, update the API to allow it:

1. Go to your `sales-agent-api` service
2. Click **"Variables"** tab
3. Click **"Edit Config"** on the right
4. Add this environment variable:

```
CORS_ORIGIN=https://your-web-service-url.railway.app
```

Then in your code (`src/server-http.ts`), update the CORS section:

```typescript
const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true,
});
```

Redeploy the API service.

---

## 📱 WeChat Access

### Option A: Direct Link Sharing (Easiest)
1. Copy your web dashboard URL from Railway (e.g., `https://sales-agent-web.up.railway.app`)
2. Share in WeChat group/chat
3. Team members can open in WeChat built-in browser

### Option B: QR Code
1. Generate a QR code from your URL
2. Print and place in office
3. Team scans to access

Online QR generators:
- https://qr-code-generator.com
- https://www.qr-code-generator.com

### Option C: WeChat Work Integration (For Company Teams)
If your company uses WeChat Work (企业微信):

1. Go to WeChat Work Admin Console (管理后台)
2. **Applications** → **Create Application** (创建应用)
3. Set application URL to your Railway dashboard URL
4. Team members access via WeChat Work app

---

## 🔒 Security & Production Checklist

Before sharing with your team:

- [ ] API service deployed and health check passes (`/health` endpoint)
- [ ] Web dashboard loads correctly
- [ ] Volume is mounted at `/app/data` (check in Railway dashboard)
- [ ] Test creating a lead → restart service → verify data persists
- [ ] HTTPS is enabled (Railway provides this automatically)
- [ ] CORS configured to allow your web domain
- [ ] Test from mobile device (iPhone/Android)
- [ ] Test from WeChat app

---

## 🔄 Alternative Deployment Options

### Option 2: Fly.io (Also Free with 3GB Storage)

```bash
# Install flyctl
brew install flyctl

# Login
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent
fly auth login

# Launch (creates fly.toml)
fly launch

# Create volume for persistence
fly volumes create sales_data --size 3

# Deploy
fly deploy
```

Your app will be at `https://your-app-name.fly.dev`

### Option 3: Self-Host on VPS (Cheapest Long-term)

| Provider | Price | Storage | Best For |
|----------|-------|---------|----------|
| **Hetzner** (Germany) | €3.29/month | 20GB | Cheapest reliable |
| **DigitalOcean** | $4/month | 25GB | Easy to use |
| **Vultr** | $2.50/month | 10GB | Lowest price |
| **腾讯云轻量服务器** | ~¥40/month | 50GB | Best for China users |

---

## 🛠 Troubleshooting

### Issue: "Service crashed" or "Exit code 1"
**Solution**: Check logs in Railway dashboard → "Deployments" tab. Common fixes:
- Ensure `DATA_DIR=/app/data` is set
- Ensure Volume is mounted at `/app/data`
- Check that `npm run build` succeeded

### Issue: "Cannot find module" errors
**Solution**: 
- Verify `npm install` ran during build
- Check that `package.json` includes all dependencies
- Try clearing build cache: Railway dashboard → "Settings" → "Clear Build Cache"

### Issue: Data disappears after restart
**Solution**: 
- Volume not mounted correctly
- Check `DATA_DIR` environment variable is set to `/app/data`
- Verify database file exists: SSH into container or check logs

### Issue: WeChat shows "Unable to open page"
**Solution**: 
- Ensure HTTPS is enabled (Railway provides this)
- Check CORS settings allow your web domain
- Test URL in regular browser first

### Issue: Slow loading in China
**Solution**: 
- Railway servers are global but may be slow in China
- Consider **腾讯云** or **阿里云** for China deployment
- Or use a CDN like Cloudflare (free)

---

## 💾 Database Backup

### Manual Backup
Download the database file from Railway:

1. Go to your API service → "Volumes" tab
2. Click on the volume name
3. Use Railway CLI to download:
```bash
railway login
railway connect  # SSH into container
cp /app/data/sales-agent.db /tmp/
# Download from /tmp/sales-agent.db
```

Or use a simple backup script in your app:
```bash
# Add to package.json scripts
"backup": "cp /app/data/sales-agent.db /app/data/backup-$(date +%Y%m%d).db"
```

---

## 🚀 Quick Start for Your Team

Once deployed, share this message in WeChat:

```
🎉 销售助手已上线！

📊 访问链接: https://your-app-url.railway.app

✅ 功能：
• 客户线索管理
• 销售管道跟踪  
• 会议日程安排
• 邮件模板管理
• 数据分析报表

🌐 支持中英文切换
💾 数据自动云端保存
📱 手机/电脑都能用

有问题随时找我！
```

---

## 📊 Railway Free Tier Limits

| Resource | Free Limit |
|----------|-----------|
| Execution time | 500 hours/month |
| RAM | 512MB per service |
| Storage | 5GB total |
| Outbound data | 100GB/month |

For a small sales team (< 10 people), this should be plenty!

---

## 💡 Next Steps

1. **Custom Domain**: 
   - Buy domain (e.g., sales.yourcompany.com)
   - Add to Railway: Service → Settings → Domains

2. **Add Authentication**:
   ```bash
   npm install express-session passport
   ```
   Add simple password protection

3. **WeChat Mini Program**:
   - Convert to WeChat Mini Program for better UX
   - Requires separate development

4. **Notifications**:
   - Add email notifications for follow-ups
   - Integrate WeChat Work API for alerts

---

**Need help?** Check Railway docs: https://docs.railway.app
