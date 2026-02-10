# Sales Agent API - FC 3.0 部署指南

## 快速部署（3步）

### 1. 准备代码

```bash
cd /Users/zyp/Documents/KimiVSCodeProjectRoot/sales-agent
npm install  # 可选，项目无依赖
npm run build
```

### 2. 控制台创建函数

访问：https://fcnext.console.aliyun.com

| 配置项 | 值 |
|--------|-----|
| 函数名称 | `sales-agent-api` |
| 运行时 | `Node.js 20` |
| 代码上传 | 上传 `dist/` 文件夹 |
| 函数入口 | `dist/index.handler` |
| 内存 | 256 MB |
| 超时 | 30 秒 |

环境变量：
- `NODE_ENV` = `production`

### 3. 创建 HTTP 触发器

- 类型：HTTP
- 认证：无需认证
- 方法：GET, POST, OPTIONS

完成后获得 URL：`https://xxx.fcapp.run`

## 测试

```bash
# 健康检查
curl https://xxx.fcapp.run/health

# 创建线索
curl -X POST https://xxx.fcapp.run/api/create_lead \
  -H "Content-Type: application/json" \
  -d '{"name":"张三","email":"zhang@example.com","company":"ABC公司","source":"官网"}'

# 列出现索
curl https://xxx.fcapp.run/api/list_leads

# 看板统计
curl https://xxx.fcapp.run/api/get_pipeline
```

## API 端点

| 端点 | 说明 |
|------|------|
| `GET /health` | 健康检查 |
| `POST /api/create_lead` | 创建线索 |
| `GET /api/list_leads` | 列出现索 |
| `GET /api/get_lead?leadId=xxx` | 获取线索 |
| `POST /api/update_lead` | 更新线索 |
| `POST /api/delete_lead` | 删除线索 |
| `GET /api/get_pipeline` | 看板统计 |

## 注意事项

- 数据存储在 `/tmp/data.json`，实例回收后重置
- 个人使用建议定期备份数据
- 免费额度：100万次调用/月
