<script setup lang="ts">
import {computed} from 'vue'
import {money} from '../services/format'
const props=defineProps<{amount:string}>()
const parts=computed(()=>money(props.amount).split('.'))
</script>
<template><span class="money-display"><span class="money-currency">¥</span><strong>{{parts[0]}}<span class="money-decimal">.{{parts[1]}}</span></strong></span></template>
