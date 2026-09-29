<template>
  <AppointmentWorkspace kind="pickup" title="提货预约" :permissions="permissions" />
</template>

<script setup lang="ts">
  import AppointmentWorkspace from '../modules/appointment-workspace.vue'

  defineOptions({ name: 'TmsPickupAppointment' })

  const permissions = {
    add: 'TmsPickupAppointment:Add',
    edit: 'TmsPickupAppointment:Edit',
    delete: 'TmsPickupAppointment:Delete',
    confirm: 'TmsPickupAppointment:Confirm',
    complete: 'TmsPickupAppointment:Complete',
    arrival: 'TmsPickupAppointment:Arrival'
  }
</script>
