<div align="center">
  <h1>亿企工场 TMS</h1>
  <p><strong>覆盖主数据、开单、调度、运输执行、在途监控与签收协同的智慧运输应用</strong></p>
  <p>把客户委托、运输资源、履约过程、移动司机端与财务结算连接成一条可追踪的运输链路。</p>

  <p>
    <a href="https://gitee.com/wangyanghub/art-supabase-tms">Gitee</a>
    ·
    <a href="https://github.com/869123771/art-supabase-tms">GitHub</a>
    ·
    <a href="https://gitee.com/wangyanghub/art-supabase-pro">主平台</a>
    ·
    <a href="https://gitee.com/wangyanghub/supabase-mobile-tms-driver">司机端</a>
    ·
    <a href="https://869123771.github.io/art-supabase-doc/modules/tms">使用文档</a>
  </p>
</div>

## 项目定位

亿企工场 TMS 是亿企工场的运输管理业务应用，面向物流运输从主数据、订单和运单生成，到配载、在途、签收与财务协作的完整履约过程。

本仓只维护 TMS 页面、业务 API、领域类型、运输规则与专属 Edge Functions。认证、租户、菜单、权限、布局、路由、公共组件、Store 和 Supabase 公共客户端由 [`art-supabase-pro`](https://gitee.com/wangyanghub/art-supabase-pro) 统一提供。

![AI 智能填单](screenshots/ai-order-copilot.png)

![实时在途监控](screenshots/in-transit-monitor.png)

## 核心能力

| 领域       | 已覆盖能力                                                                |
| ---------- | ------------------------------------------------------------------------- |
| 运输主数据 | 客户、客户地址、常用线路、货物、承运商、司机、站点、合同与客户/承运商价格 |
| 开单与订单 | 工作区开单、AI 文本/图片识别、主数据匹配、订单列表、订单详情与状态跟踪    |
| 运力与调度 | 运力规划、待运载、配载、司机车辆组合与运输资源校验                        |
| 运输执行   | 运单详情、运输事件、装卸货、发车、到达、签收、回单与异常处置              |
| 运营监控   | 实时在途地图、车辆/运单视图、线路绩效、运输告警与 AI 异常研判             |
| 跨域协同   | 司机移动端执行、VMS 车辆引用、FMS 费用/结算与平台审批工作流               |

## 标准履约链路

```text
客户委托
  → 开单 / AI 识别
  → 订单与运单
  → 运力规划与配载
  → 装货 / 发车 / 在途
  → 到达 / 卸货 / 签收
  → 回单 / 费用 / 对账与利润
```

AI 智能填单只生成可复核草稿；调度推荐和异常研判只提供辅助判断。保存、改派、签收、费用与状态变化仍由有权限的操作人员确认，并由服务端业务规则约束。

### 调度运单编号

- 普通配载沿用原始运单号；拆单按原始运单号依次生成 `-01` 至 `-99`；合单使用独立的 `DY` 调度号。
- 拆单序号按同一原始单的历史调度记录递增，已撤销的序号不复用。撤销的普通配载记录保留审计历史，当前有效调度号仍保持唯一。
- 编号由数据库 `tms_create_dispatch_plan_secure` 在锁定原始单后生成。2026-09-28 已将两条待接单的历史拆单号修正为 `YD202608-013-01`、`YD202608-013-02`；回滚验证、实际结果校验和有效运单号唯一性校验均通过。

### 运输订单报价

- 订单列表的“报价”操作打开报价表单。运输费、卸货费、送货费、保险费、税费与补充费用共同组成报价总额；从 `tmsOrderQuoteExpenseItem` 字典选中费用项后立即添加，可连续添加多项，当前字典为人工费、吊车费、其他费用。
- “保存报价”保留草稿；“提交报价”仅在系统内标记为已提交，不发送客户通知。报价独立存于 `public.tms_order_quote`，不改写订单应收费用；每单保留一份当前报价。附件最多 6 个，必须属于订单租户。
- 读写分别经 `tms_get_order_quote_secure`、`tms_save_order_quote_secure` RPC；菜单权限 `TmsOrderList:Quote`、订单字段权限、租户范围、金额与字典值由服务端复核。2026-09-28 使用事务回滚验证了同租户草稿与提交、金额合计、零额提交拒绝及平台全量、平台选定租户、普通用户的跨租户访问边界。

### 基础资料补充

- “黑名单”“投诉咨询”“电子合同”“运输协议”分别存于 `tms_driver_blacklist`、`tms_service_case`、`tms_electronic_contract`、`tms_transport_agreement`。四页复用平台的查询表格、详情描述、上传控件与空状态组件。
- 服务单号、电子合同号、运输协议号通过系统编号规则按租户和月份生成，分别使用 `TS`、`DZHT`、`YSXY` 前缀与 3 位流水码。复制合同会生成新合同号，终止合同保留原记录。
- 普通用户只可读取所属租户的资料；四表各有一条按租户范围读取策略和三条平台超级管理员写入策略。新增、编辑、删除、复制及终止操作由数据库边界约束。承运商和车辆参选按租户筛选，运输协议保存车辆档案中的车型与车长快照。
- 合同复制与承运商参选 RPC 供已登录用户调用，函数内再次检查权限和租户范围；复制还检查平台超级管理员身份，普通用户的承运商参选结果不含联系人或法定代表人。
- 2026-09-29 为四页各创建 2 条演示记录，并以事务回滚验证了新增、编辑、批量删除、合同复制与终止、编号生成及跨租户读写边界。数据库性能顾问对四张新表无提示；安全顾问对上述两个已登录用户可调用的受控 RPC 仍给出常规 [`SECURITY DEFINER` 提示](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)。

## 司机端协同

独立的 [`supabase-mobile-tms-driver`](https://gitee.com/wangyanghub/supabase-mobile-tms-driver) 提供 H5 与微信小程序司机工作台。司机可接单，完成装卸货定位打卡、发车、到达、签收、收车、凭证上传与费用上报；所有记录通过受控契约回流同一条 TMS 运单履约链路。

## 独立运行

环境要求：Node.js `>= 22.0.0`、pnpm `>= 11.9.0`。

```powershell
pnpm install
pnpm dev
```

默认访问 `http://localhost:3016`。使用在途地图时还需配置高德地图浏览器 Key、安全码和允许域名。

```powershell
pnpm check
pnpm build
pnpm preview
```

生产构建输出到 `docs/`，默认公共路径为 `/art-supabase-tms/`，可作为 Pages 发布目录。

## 与主仓协作

TMS 业务修改在本仓提交并推送，随后在主仓更新 `modules/art-supabase-tms` 子模块指针。数据库菜单继续使用稳定的 `/tms/...` 路由前缀；跨模块读取通过租户隔离、字段最小化的 API/RPC 契约完成，本仓不直接导入其他业务仓源码。

## 安全原则

- 前端菜单和按钮只改善交互，RLS、RPC 与 Edge Functions 才是最终授权边界。
- 普通用户只使用租户范围内的安全数据；受控写入和状态变化必须经过服务端校验。
- 前端只配置 Supabase `anon` / publishable key，服务端密钥不得进入 Vite 环境变量。

## 许可证

本项目采用 [MulanPSL-2.0](LICENSE) 许可证。
