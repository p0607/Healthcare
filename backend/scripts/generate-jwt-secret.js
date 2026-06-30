#!/usr/bin/env node
/** Print a random JWT secret suitable for production JWT_SECRET. */
const { randomBytes } = require('crypto');
console.log(randomBytes(48).toString('base64url'));
