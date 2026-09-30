import assert from 'node:assert/strict'
import test from 'node:test'
import type { RegionOption } from '@/api/region-options'
import { recognizeAddressText } from '../../src/views/basic-data/customer-address/modules/recognize-address'

const regions: RegionOption[] = [
  {
    code: '11',
    name: '北京市',
    children: [
      {
        code: '1101',
        name: '市辖区',
        children: [{ code: '110105', name: '朝阳区' }]
      }
    ]
  },
  {
    code: '44',
    name: '广东省',
    children: [
      {
        code: '4403',
        name: '深圳市',
        children: [{ code: '440305', name: '南山区' }]
      }
    ]
  }
]

test('pasted address fills contact, company, district and detail', () => {
  assert.deepEqual(
    recognizeAddressText(
      '张三，13800138000，北京市朝阳区酒仙桥路14号院5号，某某物流有限公司',
      regions
    ),
    {
      contactName: '张三',
      contactPhone: '13800138000',
      partyName: '某某物流有限公司',
      regionPath: ['北京市', '市辖区', '朝阳区'],
      regionAdcode: '110105',
      addressDetail: '酒仙桥路14号院5号',
      addressShortName: '酒仙桥路14号院5号'
    }
  )
})

test('labeled spoken address keeps the province and city path', () => {
  const result = recognizeAddressText(
    '联系人：李四；电话：13912345678；地址：广东省深圳市南山区科技园1号；单位：测试科技有限公司',
    regions
  )
  assert.equal(result.contactName, '李四')
  assert.equal(result.contactPhone, '13912345678')
  assert.deepEqual(result.regionPath, ['广东省', '深圳市', '南山区'])
  assert.equal(result.addressDetail, '科技园1号')
  assert.equal(result.partyName, '测试科技有限公司')
})

test('spoken address without punctuation still separates the name and company', () => {
  const result = recognizeAddressText(
    '张三 13800138000 北京市朝阳区酒仙桥路14号院5号 某某物流有限公司',
    regions
  )
  assert.equal(result.contactName, '张三')
  assert.equal(result.partyName, '某某物流有限公司')
  assert.equal(result.addressDetail, '酒仙桥路14号院5号')
})
