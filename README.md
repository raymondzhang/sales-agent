# Sales Agent API

销售线索管理 API，阿里云 FC 3.0 Serverless 部署。

## 功能

- 客户线索 CRUD
- 销售看板统计
- JSON 文件存储

## 部署

见 [DEPLOY.md](DEPLOY.md)

## 开发

```bash
npm run build    # 编译 TypeScript
```

## API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| POST | `/api/create_lead` | 创建线索 |
| GET | `/api/list_leads` | 列出现索 |
| GET | `/api/get_pipeline` | 看板统计 |
