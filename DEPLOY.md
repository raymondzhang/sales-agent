# Deployment Guide for WeChat Access

## 🎯 Goal
Deploy Sales Agent so your team can access it via WeChat (微信) with persistent data storage.

## 💰 Economic Solution: Render.com (Free Tier)

### What You Get (Free)
- **Web Dashboard**: HTTPS URL accessible from WeChat
- **API Server**: Backend with SQLite database
- **Persistent Storage**: 1GB disk for database
- **Auto-deploy**: From GitHub
- **Custom Domain**: Support for your own domain

### Estimated Cost
- **Free tier**: $0/month (perfect for small teams)
- **Paid tier**: $7-19/month (if you need more resources)

---

## 📋 Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/sales-agent.git
git push -u origin main
```

### Step 2: Deploy API Server on Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click **New +** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `sales-agent-api`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:server`
   - **Plan**: Free
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `DATA_DIR`: `/var/data`
6. Click **Advanced** → Add Disk:
   - **Name**: `sales-data`
   - **Mount Path**: `/var/data`
   - **Size**: 1 GB
7. Click **Create Web Service**

### Step 3: Deploy Web Dashboard on Render

1. In Render, click **New +** → **Static Site**
2. Connect the same GitHub repo
3. Configure:
   - **Name**: `sales-agent-web`
   - **Build Command**: `cd web && npm install && npm run build`
   - **Publish Directory**: `web/dist`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://sales-agent-api.onrender.com/api`
   (Replace with your actual API URL from Step 2)
5. Click **Create Static Site**

### Step 4: Update CORS (Important!)

After deployment, update `sales-agent/src/server-http.ts`:

```typescript
const corsMiddleware = cors({
  origin: [
    "https://sales-agent-web.onrender.com",  // Your web dashboard URL
    "https://your-domain.com",  // If you have custom domain
  ],
  credentials: true,
});
```

Then redeploy the API.

---

## 📱 WeChat Access

### Option A: Direct Link Sharing
1. Copy your web dashboard URL: `https://sales-agent-web.onrender.com`
2. Share in WeChat group/chat
3. Team members can open in WeChat browser

### Option B: WeChat Work Integration (Recommended for Teams)
If your company uses WeChat Work (企业微信):

1. Go to WeChat Work Admin Console
2. **Applications** → **Create Application**
3. Set application URL to your deployed dashboard
4. Team members access via WeChat Work app

### Option C: QR Code
1. Generate QR code from your URL
2. Print and place in office
3. Team scans to access

---

## 🔒 Security Considerations

### For Production Use

1. **Add Authentication** (Recommended)
   ```bash
   npm install express-session passport
   ```
   Add simple password protection or OAuth.

2. **Database Backup**
   - Render disk is persistent but back up regularly
   - Download `/var/data/sales-agent.db` periodically

3. **HTTPS**
   - Render provides HTTPS automatically
   - WeChat requires HTTPS for web apps

4. **Rate Limiting**
   Add rate limiting to prevent abuse:
   ```bash
   npm install express-rate-limit
   ```

---

## 🔄 Alternative: China-Accessible Deployment

If Render is slow in China, consider:

### Option 1: 腾讯云 (Tencent Cloud) - Free Tier
- CloudBase (云开发): Free tier with database
-轻量应用服务器: ~¥40/month

### Option 2: Railway.app
- Similar to Render
- May have better China connectivity

### Option 3: Fly.io
- Edge deployment
- Good global performance

---

## 📊 Database Migration

To migrate from in-memory to SQLite:

```bash
# Export existing data (if any)
curl https://your-api.com/api/dashboard > backup.json

# After deployment, data persists automatically
# Database is at /var/data/sales-agent.db on Render
```

---

## 🛠 Troubleshooting

### Issue: WeChat shows "Unable to open page"
- **Solution**: Ensure HTTPS is enabled
- Check CORS settings allow your domain

### Issue: Data disappears after restart
- **Solution**: Verify disk is mounted at `/var/data`
- Check `DATA_DIR` environment variable

### Issue: Slow loading in China
- **Solution**: Use a CDN or deploy to a China-based server
- Consider Tencent Cloud or Alibaba Cloud

---

## ✅ Checklist

Before sharing with your team:

- [ ] API deployed and health check passes
- [ ] Web dashboard loads correctly
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Database disk mounted
- [ ] Test create/read/update operations
- [ ] Test from WeChat mobile app
- [ ] Backup strategy in place

---

## 🚀 Quick Start for Team

Once deployed, share this with your team:

```
销售助手已上线！📱

访问链接: https://sales-agent-web.onrender.com

功能：
- 📊 查看销售仪表盘
- 👥 管理客户线索
- 📅 安排会议
- ✉️ 邮件模板
- 📈 数据分析

支持中英文切换
数据自动保存
```

---

## 💡 Next Steps

1. **Custom Domain**: Buy a domain and point to Render
2. **WeChat Mini Program**: Convert to mini app for better UX
3. **Notifications**: Add email/WeChat notifications for follow-ups
4. **Mobile App**: Build native app using Capacitor

---

**Questions?** Check Render docs: https://render.com/docs
