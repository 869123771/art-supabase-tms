import type { Component } from 'vue'
import { bootstrapPlatformApp } from '@/bootstrap'
import { registerApplicationViewModules } from '@/router/core/ComponentLoader'

type RouteComponentModule = { default: Component }

const tmsSourceRoot = './views'
const tmsModules = import.meta.glob<RouteComponentModule>([
  './views/**/*.vue',
  '!./views/**/modules/**/*.vue',
  '!./views/**/components/**/*.vue'
])

registerApplicationViewModules('tms', tmsSourceRoot, tmsModules)
bootstrapPlatformApp()
