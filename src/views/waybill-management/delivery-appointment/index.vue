<template>
  <AppointmentWorkspace kind="delivery" title="送货预约" :permissions="permissions" />
</template>

<script setup lang="ts">
  import AppointmentWorkspace from '../modules/appointment-workspace.vue'

  defineOptions({ name: 'TmsDeliveryAppointment' })

  const permissions = {
    add: 'TmsDeliveryAppointment:Add',
    edit: 'TmsDeliveryAppointment:Edit',
    delete: 'TmsDeliveryAppointment:Delete',
    confirm: 'TmsDeliveryAppointment:Confirm',
    complete: 'TmsDeliveryAppointment:Complete',
    arrival: 'TmsDeliveryAppointment:Arrival'
  }
</script>
