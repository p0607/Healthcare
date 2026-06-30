/**
 * @nursecare/shared
 *
 * Framework-agnostic logic shared by the web (Vite/React) and mobile (Expo/React Native)
 * clients. Nothing in here may import React, the DOM, browser globals, or React Native —
 * keep it pure so both platforms can use it unchanged.
 */
export * from './src/caregiverServices.js';
export * from './src/checkout.js';
export * from './src/addressFormat.js';
export * from './src/serviceCatalog.js';
export * from './src/patientProfile.js';
export * from './src/comprehensiveProfile.js';
export * from './src/caregiverLocation.js';
export * from './src/sosAlert.js';
export * from './src/adminPermissions.js';
