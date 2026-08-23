/**
 * TMS 提供给平台工作台的只读聚合契约。
 *
 * 平台只能通过这里读取租户隔离后的运输摘要，不得依赖 TMS 内部 provider。
 */
export { fetchSecureOrders } from './modules/transport-secure'
