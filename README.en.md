<div align="center">
  <h1>Art Supabase TMS</h1>
  <p><strong>Transportation management from master data and order entry to dispatch, execution, tracking, and proof of delivery</strong></p>
  <p>
    <a href="https://gitee.com/wangyanghub/art-supabase-tms">Gitee</a> ·
    <a href="https://github.com/869123771/art-supabase-tms">GitHub</a> ·
    <a href="https://gitee.com/wangyanghub/art-supabase-pro">Platform</a> ·
    <a href="https://gitee.com/wangyanghub/supabase-mobile-tms-driver">Driver App</a> ·
    <a href="./README.md">简体中文</a>
  </p>
</div>

## Overview

Art Supabase TMS is the transportation domain application of Art Supabase Pro. It connects customers, carriers, drivers, cargo, contracts, pricing, order entry, waybills, capacity planning, dispatch, in-transit monitoring, delivery, proof of delivery, and finance collaboration.

This repository owns TMS pages, APIs, domain types, transportation rules, and dedicated Edge Functions. Authentication, tenancy, navigation, permissions, layout, shared components, stores, and the Supabase client come from [`art-supabase-pro`](https://gitee.com/wangyanghub/art-supabase-pro).

![AI-assisted order entry](screenshots/ai-order-copilot.png)

![Real-time in-transit monitoring](screenshots/in-transit-monitor.png)

## Capabilities

- Transportation master data, contracts, routes, stations, and customer/carrier pricing.
- Assisted order entry with text/image extraction and reviewable master-data matching.
- Orders, waybills, capacity planning, loading, dispatch, and resource validation.
- Real-time route monitoring, transportation events, alerts, performance, and AI-assisted anomaly analysis.
- Arrival, unloading, signatures, proof of delivery, expense, settlement, and profit collaboration.
- A separate H5 and WeChat Mini Program for driver execution.

## Driver Workflow

The [`supabase-mobile-tms-driver`](https://gitee.com/wangyanghub/supabase-mobile-tms-driver) application lets drivers accept assignments, check in at loading and unloading locations, record departure and return mileage, upload photos and tickets, capture signatures and proof of delivery, and submit expenses. These records join the same server-controlled waybill lifecycle.

## Local Development

Requirements: Node.js `>= 22.0.0` and pnpm `>= 11.9.0`.

```powershell
pnpm install
pnpm dev
```

The default development URL is `http://localhost:3016`.

```powershell
pnpm check
pnpm build
pnpm preview
```

The production build is written to `docs/` with `/art-supabase-tms/` as its default public path.

## Architecture and Security

- Domain changes are committed here, then the main repository updates its `modules/art-supabase-tms` submodule pointer.
- Cross-domain reads use tenant-scoped, minimal API/RPC contracts; TMS does not import another domain repository directly.
- UI permissions improve the experience, while RLS, RPC validation, and Edge Functions remain the final authorization boundary.
- AI output is reviewable assistance. Users with explicit permission remain responsible for saves and workflow-state changes.

## License

Released under [MulanPSL-2.0](LICENSE).
