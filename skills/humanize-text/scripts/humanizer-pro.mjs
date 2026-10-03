#!/usr/bin/env node
import { main } from './client.mjs';
try { await main(); }
catch (error) {
  console.error(error.message || 'Humanizer PRO command failed.');
  process.exitCode = 1;
}
