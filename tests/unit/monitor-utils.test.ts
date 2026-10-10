import assert from 'node:assert/strict'
import test from 'node:test'
import type { InTransitRecord } from '../../src/views/in-transit-monitor/modules/monitor-types'
import {
  dedupeGeoPath,
  escapeHtml,
  estimateDistanceKm,
  getAverageProgress,
  getDrivingRouteKey,
  resolveActualTrackPath,
  resolveArrivalPerformance,
  resolveEndpointGeo,
  resolveProgress,
  resolveSpeed,
  resolveTransitStatus,
  toGeoCoord
} from '../../src/views/in-transit-monitor/modules/monitor-utils'

test('toGeoCoord normalizes valid coordinates and rejects invalid ranges', () => {
  assert.deepEqual(toGeoCoord('120.1234567', '30.7654321'), [120.123457, 30.765432])
  assert.equal(toGeoCoord(181, 30), undefined)
  assert.equal(toGeoCoord(120, Number.NaN), undefined)
})

test('GPS paths retain ordered unique points', () => {
  const path: Array<[number, number]> = [
    [100, 20],
    [101, 21],
    [101, 21],
    [102, 22],
    [103, 23]
  ]

  assert.deepEqual(dedupeGeoPath(path), [
    [100, 20],
    [101, 21],
    [102, 22],
    [103, 23]
  ])
})

test('resolveTransitStatus follows delayed, completed, and running precedence', () => {
  assert.equal(resolveTransitStatus({ status: 'transporting' } as InTransitRecord, true), 'delayed')
  assert.equal(resolveTransitStatus({ status: 'completed' } as InTransitRecord, false), 'arrived')
  assert.equal(
    resolveTransitStatus({ status: 'loading' } as InTransitRecord, false),
    'transporting'
  )
  assert.equal(resolveTransitStatus({ status: 'created' } as InTransitRecord, false), 'pending')
})

test('distance and marker escaping stay safe at external map boundaries', () => {
  assert.ok(estimateDistanceKm([120, 30], [121, 30]) > 90)
  assert.equal(escapeHtml('<img title="x">'), '&lt;img title=&quot;x&quot;&gt;')
})

test('missing telemetry never becomes zero or generated coordinates and speeds', () => {
  for (const value of [undefined, null, '', ' ', 'invalid']) {
    assert.equal(toGeoCoord(value, 30), undefined)
    assert.equal(toGeoCoord(120, value), undefined)
    assert.equal(resolveSpeed({ waybillNo: 'W1', speedKmh: value }), null)
  }
  assert.deepEqual(toGeoCoord(0, 0), [0, 0])
  assert.equal(resolveSpeed({ waybillNo: 'W1', speedKmh: 0 }), 0)
  assert.equal(resolveSpeed({ waybillNo: 'W1', speedKmh: '73.4' }), 73)
  assert.equal(resolveSpeed({ waybillNo: 'W1', speedKmh: -1 }), null)
  assert.equal(resolveEndpointGeo({ waybillNo: 'W1' }, 'origin', null, null, '未知地址'), undefined)
  assert.equal(estimateDistanceKm([120, 30], [120, 30]), 0)
})

test('estimated progress requires a valid schedule and excludes generated movement', () => {
  const now = Date.parse('2026-10-10T06:00:00Z')
  const record: InTransitRecord = {
    waybillNo: 'W1',
    plannedLoadTime: '2026-10-10T00:00:00Z',
    plannedUnloadTime: '2026-10-10T12:00:00Z'
  }
  assert.equal(resolveProgress(record, 'transporting', now), 50)
  assert.equal(resolveProgress({ ...record, waybillNo: 'different' }, 'transporting', now), 50)
  assert.equal(resolveProgress(record, 'transporting', now - 12 * 60 * 60 * 1000), 0)
  assert.equal(resolveProgress(record, 'delayed', now + 12 * 60 * 60 * 1000), 99)
  for (const value of [undefined, null, '', 'invalid', '12:34'])
    assert.equal(resolveProgress({ ...record, plannedLoadTime: value }, 'transporting', now), null)
  assert.equal(resolveProgress({ waybillNo: 'W1' }, 'arrived', now), 100)
  assert.equal(resolveProgress({ waybillNo: 'W1' }, 'pending', now), 0)
  assert.equal(getAverageProgress([{ progress: 50 }, { progress: null }, { progress: 100 }]), 75)
  assert.equal(getAverageProgress([{ progress: null }]), null)
})

test('planned route points are never mixed into the actual GPS track', () => {
  const record: InTransitRecord = {
    waybillNo: 'W1',
    routePoints: [
      { type: 'origin', longitude: 120, latitude: 30 },
      { type: 'gps', longitude: 121, latitude: 31 },
      { type: 'gps', longitude: null, latitude: null },
      { type: 'destination', longitude: 122, latitude: 32 }
    ]
  }
  assert.deepEqual(resolveActualTrackPath(record), [[121, 31]])
})

test('arrival punctuality requires actual arrival evidence and ignores record update time', () => {
  const record: InTransitRecord = {
    waybillNo: 'W1',
    plannedUnloadTime: '2026-10-10T12:00:00Z',
    updateTime: '2026-10-10T13:00:00Z'
  }
  assert.deepEqual(resolveArrivalPerformance(record), { delayed: null, text: '暂无到达时间' })
  assert.deepEqual(resolveArrivalPerformance({ ...record, unloadedAt: '2026-10-10T11:00:00Z' }), {
    delayed: false,
    text: '准时'
  })
  assert.deepEqual(resolveArrivalPerformance({ ...record, unloadedAt: '2026-10-10T13:00:00Z' }), {
    delayed: true,
    text: '延误1h'
  })
})

test('route caching invalidates on endpoint changes and refuses missing endpoints', () => {
  const original = getDrivingRouteKey({ id: 'W1', originGeo: [120, 30], destinationGeo: [121, 31] })
  assert.notEqual(
    original,
    getDrivingRouteKey({ id: 'W1', originGeo: [120, 30], destinationGeo: [122, 32] })
  )
  assert.equal(getDrivingRouteKey({ id: 'W1' }), undefined)
})
