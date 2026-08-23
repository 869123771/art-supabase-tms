import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const repositoryRoot = process.cwd()
const sourceRoot = path.join(repositoryRoot, 'src')
const allowedSourceRoots = new Set(['api', 'types', 'views'])
const allowedRootFiles = new Set(['index.ts', 'main.ts'])
const sourceExtensions = new Set(['.ts', '.tsx', '.vue'])
const violations: string[] = []

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (entry.isDirectory() && !allowedSourceRoots.has(entry.name)) {
    violations.push(`不允许的公共源码目录: src/${entry.name}`)
  }
  if (entry.isFile() && !allowedRootFiles.has(entry.name)) {
    violations.push(`不允许的应用壳文件: src/${entry.name}`)
  }
}

const requiredPaths = [
  'src/index.ts',
  'src/main.ts',
  'src/views/order-open',
  'src/views/order-list',
  'src/views/waybill-management',
  'src/views/delivery-management',
  'src/views/in-transit-monitor',
  'src/views/basic-data',
  'src/api/index.ts',
  'src/api/integration.ts'
]
for (const requiredPath of requiredPaths) {
  if (!existsSync(path.join(repositoryRoot, requiredPath))) {
    violations.push(`缺少 TMS 业务入口: ${requiredPath}`)
  }
}

function collectSourceFiles(target: string): string[] {
  if (!existsSync(target)) return []
  if (!statSync(target).isDirectory()) return [target]
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    collectSourceFiles(path.join(target, entry.name))
  )
}

for (const filePath of collectSourceFiles(sourceRoot)) {
  if (!sourceExtensions.has(path.extname(filePath))) continue
  const source = readFileSync(filePath, 'utf8')
  if (
    source.includes('@/api/tms') ||
    source.includes('@tms/api/tms') ||
    source.includes('@/views/tms') ||
    source.includes('@/assets/images/tms')
  ) {
    violations.push(`${path.relative(repositoryRoot, filePath)} 仍引用迁移前的主仓 TMS 路径`)
  }
  if (/@\/(?:views|api)\/(?:finance|fms|hr|smis|vms)(?:['"/])/.test(source)) {
    violations.push(`${path.relative(repositoryRoot, filePath)} 直接引用了其他业务仓前端源码`)
  }
}

if (violations.length > 0) {
  console.error(['TMS 模块边界审计失败：', ...violations.map((item) => `- ${item}`)].join('\n'))
  process.exitCode = 1
} else {
  console.log('TMS business-only boundary audit passed.')
}
