# Art Supabase TMS

TMS 智慧运输业务模块。这个仓库只维护运输领域代码，不包含登录、租户、菜单、权限、布局、路由、公共组件、公共 store 或 Supabase 客户端。

## 仓库内容

- `src/views`：TMS 页面与页面内业务组件；仓名已经代表 TMS，不再嵌套 `views/tms`。
- `src/api/index.ts`：TMS API 门面，`src/api/modules` 为运输业务数据访问实现。
- `src/types/api.d.ts`：TMS 专属业务类型。
- `supabase/functions`：TMS 专属 Edge Functions 与业务规则。
- `tests/unit`：TMS 领域模型、AI 合约和业务规则测试。

## 独立运行与部署

TMS 可以独立启动和部署，但公共运行时仍只维护在 `art-supabase-pro`。安装依赖时会拉取主平台的固定提交，复用同一套登录、租户、菜单、权限、布局、路由、公共组件、store 和 Supabase 客户端；本仓只注册 TMS 页面。

```powershell
pnpm install
pnpm dev
```

开发端口为 `3016`。生产构建统一输出到 `docs/`，默认静态路径为 `/art-supabase-tms/`：

```powershell
pnpm build
pnpm preview
```

`docs/.nojekyll` 会随构建自动生成，可将 `docs/` 直接作为 Pages 发布目录。若部署在域名根目录，可在构建时覆盖 `VITE_BASE_URL=/`。

## 由主平台统一运行

主仓通过 Git submodule 固定本仓提交，并以 `@tms/*` 装载同一份 TMS 源码：

```powershell
git clone --recurse-submodules https://gitee.com/wangyanghub/art-supabase-pro.git
cd art-supabase-pro
pnpm install
pnpm dev
```

更新 TMS 后，先在本仓提交并推送，再在主仓更新 `modules/art-supabase-tms` 的提交指针。这样 TMS 业务只维护一份，同时独立部署和主平台构建都可复现。

## 路由与依赖边界

- 数据库菜单继续使用稳定的 `/tms/...` 路由前缀；主仓加载器负责映射到本仓 `src/views/...`。
- 独立运行时不显示多余的“ TMS 智慧运输”外层目录，主平台全景菜单仍保留该领域分组。
- `@tms/*` 只引用本仓业务代码；`@/*` 引用主仓提供的公共运行时。
- TMS 不直接导入其他业务仓前端源码；跨模块数据通过租户隔离、字段最小化的 API/RPC 契约读取。
- 数据库 RLS、租户隔离、菜单与权限配置继续由主平台统一治理。
