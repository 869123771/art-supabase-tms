// Route inventory only. Page-specific columns and business presentation live in each route entry.
export const managementReports = [
  {
    slug: 'monthly-overview',
    group: 'business-decision',
    title: '月度经营总览看板',
    name: 'TmsReportMonthlyOverview'
  },
  {
    slug: 'receivables',
    group: 'business-decision',
    title: '应收账款跟踪表',
    name: 'TmsReportReceivables'
  },
  {
    slug: 'vehicle-profit',
    group: 'business-decision',
    title: '单车盈亏分析',
    name: 'TmsReportVehicleProfit'
  },
  {
    slug: 'route-profit',
    group: 'business-decision',
    title: '线路盈亏分析',
    name: 'TmsReportRouteProfit'
  },
  {
    slug: 'driver-productivity',
    group: 'business-decision',
    title: '司机投产出分析',
    name: 'TmsReportDriverProductivity'
  },
  {
    slug: 'order-profit',
    group: 'business-decision',
    title: '订单毛利分析',
    name: 'TmsReportOrderProfit'
  },
  {
    slug: 'customer-profit',
    group: 'business-decision',
    title: '客户毛利分析',
    name: 'TmsReportCustomerProfit'
  },
  {
    slug: 'business-risk',
    group: 'business-decision',
    title: '经营风险汇总',
    name: 'TmsReportBusinessRisk'
  },
  {
    slug: 'operations-kpi',
    group: 'operations-analysis',
    title: '运营 KPI 看板台账',
    name: 'TmsReportOperationsKpi'
  },
  {
    slug: 'order-transit',
    group: 'operations-analysis',
    title: '订单在途跟踪日报',
    name: 'TmsReportOrderTransit'
  },
  {
    slug: 'vehicle-dispatch',
    group: 'operations-analysis',
    title: '车辆调度状态台账',
    name: 'TmsReportVehicleDispatch'
  },
  {
    slug: 'driver-operations',
    group: 'operations-analysis',
    title: '司机日常运营台账',
    name: 'TmsReportDriverOperations'
  },
  {
    slug: 'order-exceptions',
    group: 'operations-analysis',
    title: '订单异常台账',
    name: 'TmsReportOrderExceptions'
  },
  {
    slug: 'receipt-tracking',
    group: 'operations-analysis',
    title: '回单跟踪管理',
    name: 'TmsReportReceiptTracking'
  },
  {
    slug: 'carrier-performance',
    group: 'operations-analysis',
    title: '外包运力考核',
    name: 'TmsReportCarrierPerformance'
  }
] as const
export type ManagementReportSlug = (typeof managementReports)[number]['slug']
