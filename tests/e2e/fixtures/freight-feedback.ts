import { createApp, defineComponent, h, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { setupGlobDirectives } from '@/directives'
import language from '@/locales'
import { store } from '@/store'
import FreightDialog from '@tms/views/order-list/modules/freight-dialog.vue'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

const order: Api.Tms.Order.OrderRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  orderNo: 'TEST-001',
  originStation: '测试始发站',
  destinationStation: '测试目的站',
  deliveryMethod: 'delivery',
  shippingContactName: '测试发货人',
  shippingContactPhone: '13800000000',
  shippingAddressDetail: '测试地址',
  receivingContactName: '测试收货人',
  receivingContactPhone: '13900000000',
  receivingAddressDetail: '测试地址',
  paymentMethod: 'cash',
  totalFee: 100
}

const Preview = defineComponent({
  setup() {
    const dialog = ref<{ handleOpen: (row: Api.Tms.Order.OrderRecord) => Promise<void> }>()
    return () =>
      h('main', { style: 'padding: 24px' }, [
        h(
          'button',
          {
            type: 'button',
            onClick: () => dialog.value?.handleOpen(order)
          },
          '打开运费弹窗'
        ),
        h(FreightDialog, { ref: dialog })
      ])
  }
})

const app = createApp(Preview)
app.use(store)
app.use(
  createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }]
  })
)
app.use(language)
setupGlobDirectives(app)
app.mount('#freight-feedback-preview')
