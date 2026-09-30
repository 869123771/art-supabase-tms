import { expect, test } from '@playwright/test'

const analysisResponse = {
  artifactId: '11111111-1111-4111-8111-111111111111',
  runId: '22222222-2222-4222-8222-222222222222',
  summary: '已识别上海到杭州的电子配件运输委托，请重点核对地址和费用。',
  confidence: 0.91,
  fieldConfidence: {
    originStationName: 0.95,
    destinationStationName: 0.94,
    shippingCustomerName: 0.92,
    receivingCustomerName: 0.9,
    shippingAddressDetail: 0.58,
    receivingAddressDetail: 0.61,
    cargoItems: 0.93
  },
  missingFields: [],
  warnings: ['请在保存前确认装货时间'],
  order: {
    originStationName: 'UI验收上海发货站',
    destinationStationName: 'UI验收杭州到货站',
    deliveryMethod: 'delivery',
    shippingCustomerName: 'UI验收发货客户',
    shippingContactName: '王先生',
    shippingContactPhone: '13800138000',
    shippingAddressDetail: '上海市浦东新区验收路1号',
    receivingCustomerName: 'UI验收收货客户',
    receivingContactName: '李女士',
    receivingContactPhone: '13900139000',
    receivingAddressDetail: '浙江省杭州市余杭区验收路2号',
    cargoItems: [
      {
        cargoName: 'UI验收电子配件',
        quantity: 20,
        unit: 'box',
        weightKg: 10000,
        volumeM3: 5.5
      }
    ],
    transportFee: 15000,
    paymentMethod: 'monthly',
    transportMode: 'road',
    orderConfig: {
      loadType: 'ltl',
      billingMode: 'weight',
      packaging: 'box',
      transportRequirements: ['moisture_proof']
    }
  }
}

test('AI 智能填单可核对运输配置并在窄屏正常展示', async ({ page }) => {
  test.setTimeout(300_000)
  const pageErrors: string[] = []
  let analysisRequests = 0
  let failReferences = false
  let ordinaryCreateTaskCount = 0
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.route('**/rest/v1/rpc/current_is_super', (route) =>
    route.fulfill({ status: 200, json: false })
  )
  await page.route('**/rest/v1/rpc/create_ai_order_master_data', (route) => {
    expect(route.request().headers()['x-art-tenant-scope']).toBeUndefined()
    const body = route.request().postDataJSON() as {
      p_tasks: Array<{ key: string; kind: string }>
    }
    ordinaryCreateTaskCount = body.p_tasks.length
    return route.fulfill({
      status: 200,
      json: body.p_tasks.map((task) => ({ ...task, id: '77777777-7777-4777-8777-777777777777' }))
    })
  })

  await page.route('**/functions/v1/ai-order-assistant', async (route) => {
    const requestBody = route.request().postDataJSON() as { action?: string } | null
    if (requestBody?.action === 'generate_example') {
      await route.fulfill({ status: 200, json: { prompt: 'AI 生成的开单示例' } })
      return
    }
    analysisRequests += 1
    if (analysisRequests === 1) {
      await route.fulfill({
        status: 504,
        json: { code: 'provider_timeout', message: 'AI 响应超时，请重试' }
      })
      return
    }
    await route.fulfill({ status: 200, json: analysisResponse })
  })

  await page.goto('/#/tms/order-open', { waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/#\/auth\/login/)
  const openButton = page.getByRole('button', { name: 'AI智能填单' })
  await expect(openButton).toBeVisible({ timeout: 240_000 })
  await page.evaluate(async () => {
    const path = '/src/store/modules/menu.ts'
    const { useMenuStore } = await import(/* @vite-ignore */ path)
    const store = useMenuStore()
    const denied = new Set([
      'TmsStation:Add',
      'TmsCustomer:Add',
      'TmsCustomerAddress:Add',
      'TmsCargo:Add'
    ])
    store.setButtonList(store.buttonList.filter((button) => !denied.has(button.name)))
  })
  await openButton.click()

  const drawer = page.locator('.el-drawer').filter({ hasText: 'AI 智能填单' })
  await expect(drawer).toBeVisible({ timeout: 30_000 })
  const drawerWidth = await drawer.evaluate((element) => element.getBoundingClientRect().width)
  expect(drawerWidth).toBeGreaterThanOrEqual(1200)
  await expect(drawer.getByText('把聊天和图片快速变成可开单资料')).toBeVisible()
  await page.screenshot({ path: '.artifacts/ai-order-start-desktop.png', fullPage: true })

  await page.route('**/rest/v1/mdm_station**', (route) => {
    if (failReferences) {
      return route.fulfill({ status: 503, json: { message: 'Temporary lookup failure' } })
    }
    return route.fulfill({ status: 200, json: [] })
  })
  await page.route('**/rest/v1/mdm_cargo**', (route) =>
    route.fulfill({ status: 200, json: [], headers: { 'content-range': '0-0/0' } })
  )
  await page.route('**/rest/v1/rpc/tms_list_customer_selector_secure', (route) =>
    route.fulfill(
      failReferences
        ? { status: 503, json: { message: 'Temporary lookup failure' } }
        : { status: 200, json: { records: [], total: 0 } }
    )
  )

  await drawer.getByRole('button', { name: 'AI生成示例' }).click()
  await expect(drawer.getByRole('textbox').first()).toHaveValue('AI 生成的开单示例')
  await drawer.getByRole('textbox').first().fill('上海到杭州电子配件运输委托')
  await drawer.getByRole('button', { name: '开始智能识别' }).click()
  await expect(drawer.getByText('识别未完成', { exact: true })).toBeVisible()
  failReferences = true
  await drawer.getByRole('button', { name: '开始智能识别' }).click()

  await expect(drawer.getByText('识别完成', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(drawer.getByText('档案匹配暂不可用', { exact: true })).toBeVisible()
  failReferences = false
  await drawer.getByRole('button', { name: '重新匹配档案' }).click()
  await expect(drawer.getByText('已识别原始资料', { exact: true })).toBeVisible({ timeout: 30_000 })
  await expect(drawer.getByText('运输配置', { exact: true })).toBeVisible()
  await expect(drawer.getByText('零担', { exact: true })).toBeVisible()
  await expect(drawer.getByText('待建档的前置资料')).toBeVisible()
  await expect(drawer.getByText('缺少站点新增权限').first()).toBeVisible()
  await expect(drawer.getByRole('button', { name: '一键建档 0 项' })).toBeDisabled()
  await page.evaluate(async () => {
    const path = '/src/store/modules/menu.ts'
    const { useMenuStore } = await import(/* @vite-ignore */ path)
    const store = useMenuStore()
    store.setButtonList([
      ...store.buttonList,
      ...['TmsStation:Add', 'TmsCustomer:Add', 'TmsCustomerAddress:Add', 'TmsCargo:Add'].map(
        (name) => ({
          id: `test-${name}`,
          name,
          type: 'button',
          path: '',
          component: '',
          meta: { title: '新增' }
        })
      )
    ])
  })
  await expect(drawer.getByRole('button', { name: '一键建档 5 项' })).toBeEnabled()
  await expect(drawer.getByRole('button', { name: '填入当前订单' })).toBeEnabled()

  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  await expect(page.locator('.el-message')).toHaveCount(0, { timeout: 10_000 })
  await page.screenshot({ path: '.artifacts/ai-order-redesign-desktop.png', fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(drawer).toBeVisible()
  await expect
    .poll(() => drawer.evaluate((element) => element.getBoundingClientRect().left), {
      timeout: 10_000
    })
    .toBeGreaterThanOrEqual(-1)
  const drawerOverflow = await drawer.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    viewportWidth: window.innerWidth,
    pageScrollX: window.scrollX
  }))
  expect(drawerOverflow.left, JSON.stringify(drawerOverflow)).toBeGreaterThanOrEqual(-1)
  expect(drawerOverflow.right, JSON.stringify(drawerOverflow)).toBeLessThanOrEqual(391)
  expect(drawerOverflow.scrollWidth).toBeLessThanOrEqual(drawerOverflow.clientWidth + 1)
  await drawer.locator('.el-drawer__body').evaluate((element) => element.scrollTo({ top: 0 }))
  await expect(drawer.getByText('已识别原始资料', { exact: true })).toBeVisible()
  await page.screenshot({ path: '.artifacts/ai-order-redesign-mobile.png', fullPage: true })

  await drawer.getByRole('button', { name: '一键建档 5 项' }).click()
  await page.getByRole('button', { name: '确认创建' }).click()
  await expect.poll(() => ordinaryCreateTaskCount).toBe(5)

  expect(pageErrors).toEqual([])
})

test('平台超级管理员选定业务租户后可一键建档并重新匹配', async ({ page }) => {
  test.setTimeout(180_000)
  let created = false
  let submittedTaskCount = 0
  const targetTenantId = '77777777-7777-4777-8777-777777777777'
  await page.route('**/rest/v1/rpc/current_is_super', (route) =>
    route.fulfill({ status: 200, json: true })
  )
  await page.route('**/rest/v1/sys_tenant?*', (route) =>
    route.fulfill({
      status: 200,
      json: [
        {
          id: targetTenantId,
          tenant_code: 'ai-target',
          tenant_name: 'AI 验收业务租户',
          builtin_type: null,
          status: '1'
        }
      ]
    })
  )
  await page.route('**/functions/v1/ai-order-assistant', (route) =>
    route.fulfill({ status: 200, json: analysisResponse })
  )
  await page.route('**/rest/v1/mdm_station**', (route) => {
    const name = decodeURIComponent(route.request().url()).includes('上海')
      ? 'UI验收上海发货站'
      : 'UI验收杭州到货站'
    return route.fulfill({
      status: 200,
      json: created ? [{ id: '11111111-1111-4111-8111-111111111111', station_name: name }] : []
    })
  })
  await page.route('**/rest/v1/mdm_cargo**', (route) =>
    route.fulfill({
      status: 200,
      json: created
        ? [{ id: '22222222-2222-4222-8222-222222222222', cargo_name: 'UI验收电子配件' }]
        : [],
      headers: { 'content-range': created ? '0-0/1' : '0-0/0' }
    })
  )
  await page.route('**/rest/v1/rpc/tms_list_customer_selector_secure', (route) => {
    const body = route.request().postDataJSON() as { p_keyword: string }
    return route.fulfill({
      status: 200,
      json: {
        records: created
          ? [
              {
                id: body.p_keyword.includes('发货')
                  ? '33333333-3333-4333-8333-333333333333'
                  : '44444444-4444-4444-8444-444444444444',
                customer_name: body.p_keyword
              }
            ]
          : [],
        total: created ? 1 : 0
      }
    })
  })
  await page.route('**/rest/v1/rpc/tms_list_customer_addresses_secure', (route) => {
    const body = route.request().postDataJSON() as { p_customer_id: string }
    const shipping = body.p_customer_id.startsWith('3333')
    return route.fulfill({
      status: 200,
      json: {
        records: created
          ? [
              {
                id: shipping
                  ? '55555555-5555-4555-8555-555555555555'
                  : '66666666-6666-4666-8666-666666666666',
                address_detail: shipping ? '上海市浦东新区验收路1号' : '浙江省杭州市余杭区验收路2号'
              }
            ]
          : [],
        total: created ? 1 : 0
      }
    })
  })
  await page.route('**/rest/v1/rpc/create_ai_order_master_data', (route) => {
    expect(route.request().headers()['x-art-tenant-scope']).toBe(targetTenantId)
    const body = route.request().postDataJSON() as {
      p_tasks: Array<{ key: string; kind: string }>
    }
    submittedTaskCount = body.p_tasks.length
    created = true
    return route.fulfill({
      status: 200,
      json: body.p_tasks.map((task) => ({ ...task, id: '77777777-7777-4777-8777-777777777777' }))
    })
  })

  await page.goto('/#/tms/order-open', { waitUntil: 'domcontentloaded' })
  await expect(page).not.toHaveURL(/#\/auth\/login/)
  const openButton = page.getByRole('button', { name: 'AI智能填单' })
  await expect(openButton).toBeVisible({ timeout: 120_000 })
  await openButton.click()
  const drawer = page.locator('.el-drawer').filter({ hasText: 'AI 智能填单' })
  await drawer.getByRole('textbox').first().fill('上海到杭州电子配件运输委托')
  await drawer.getByRole('button', { name: '开始智能识别' }).click()
  await expect(drawer.getByText('待建档的前置资料')).toBeVisible({ timeout: 30_000 })
  await expect(drawer.getByText('请先选择目标租户', { exact: false }).first()).toBeVisible()
  await expect(drawer.getByRole('button', { name: /一键建档/ })).toBeDisabled()
  expect(submittedTaskCount).toBe(0)

  await drawer.getByRole('button', { name: '当前租户范围：全部租户' }).click()
  await page.getByText('AI 验收业务租户', { exact: true }).click()
  await expect(page.getByRole('button', { name: '当前租户范围：AI 验收业务租户' })).toBeVisible()
  const createButton = drawer.getByRole('button', { name: '一键建档 5 项' })
  await expect(createButton).toBeEnabled()
  await createButton.click()
  await page.getByRole('button', { name: '确认创建' }).click()
  await expect(drawer.getByText('无需新建基础资料')).toBeVisible({ timeout: 30_000 })
  expect(submittedTaskCount).toBe(5)
  await expect(drawer.getByRole('button', { name: /一键建档/ })).toHaveCount(0)
})
