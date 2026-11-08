<script setup lang="ts">
import { simorawaTheme } from './theme';
</script>

<template>
  <a-config-provider :theme="simorawaTheme">
    <router-view />
  </a-config-provider>
</template>
