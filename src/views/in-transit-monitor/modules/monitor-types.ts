export type InTransitRecord = Api.Tms.InTransit.MonitorRecord

export type TransitStatus = 'pending' | 'transporting' | 'arrived' | 'delayed'

export type MonitorMode = 'realtime' | 'waybill' | 'vehicle'

export type GeoCoord = [number, number]

export interface MonitorOrder {
  actualTrackPath: GeoCoord[]
  arrivalDelayed: boolean | null
  arrivalText: string
  cargoSummary: Array<{ label: string; value: string }>
  completedKm: number | null
  currentLabel: string
  delayed: boolean
  delayText: string
  destination: string
  destinationGeo?: GeoCoord
  driverName: string
  driverPhone: string
  driverPhoneVisible: boolean
  id: string
  currentGeo?: GeoCoord
  orderNo: string
  origin: string
  originGeo?: GeoCoord
  plateNo: string
  plannedArrivalTime?: string | null
  plannedDepartureTime?: string | null
  passedPath: GeoCoord[]
  progress: number | null
  progressLabel: string
  remainingKm: number | null
  remainingPath: GeoCoord[]
  routePath: GeoCoord[]
  routeName: string
  source: InTransitRecord
  speed: number | null
  status: TransitStatus
  statusColor: string
  statusLabel: string
  totalKm: number | null
  trackSource: 'gps' | 'planned' | 'unknown'
  trackSourceLabel: string
  vehicleType: string
  vehicleTypeCode: string
  vehicleTypeLabel: string
  vehicleImage: string
}

export interface MonitorOverview {
  delayedCount: number
  onTimeRate: number | null
  arrivalCount: number
  routeCount: number
  orderCount: number
  transporting: number
  vehicleCount: number
}

export interface RegionOption {
  keywords: string[]
  label: string
  value: string
}

export interface StationGeoPosition {
  coord: GeoCoord
  keywords: string[]
}

export interface ScreenState {
  error: Error | null
  keyword: string
  lastRefreshTime?: string
  loading: boolean
  loaded: boolean
  orders: InTransitRecord[]
  region: string
  selectedOrderId?: string
  status: TransitStatus | ''
}

export interface MonitorKeywordState {
  vehicle: string
  waybill: string
}

export interface AlertItem {
  content: string
  key: string
  level: 'danger' | 'warning' | 'info'
  time: string
  title: string
}

export interface ScreenScaleState {
  viewportHeight: number
  viewportWidth: number
}

export interface VehiclePoiState {
  coordinateKey: string
  label: string
  loading: boolean
}

export interface ReverseGeocodeResult {
  regeocode?: {
    formattedAddress?: string
    formatted_address?: string
    pois?: Array<{ name?: string }>
  }
}
