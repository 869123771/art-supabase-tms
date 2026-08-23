# TMS Supabase 资产

本目录只维护 TMS 专属 Edge Functions、业务规则和数据库回归测试。共享数据库迁移、Auth、租户、菜单、权限与公共 AI 运行时由 `art-supabase-pro` 统一维护。

公共 AI 运行时通过主仓不可变提交 URL 导入，避免在业务仓复制公共实现。部署示例：

```bash
supabase functions deploy ai-order-assistant --project-ref ckbftoopuyophiebamwy
```
