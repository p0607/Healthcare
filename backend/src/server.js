require('dotenv').config();
const http = require('http');
const os = require('os');
const { Server } = require('socket.io');

const { validateEnv, getCorsOrigins } = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./socket');
const prisma = require('./lib/prisma');
const { purgeExpiredOtps } = require('./lib/visitOtp');
const { repairMisplacedCaregivers } = require('./lib/caregiverLocation');
const { isSmtpConfigured } = require('./lib/mail');

validateEnv();

const PORT = process.env.PORT || 5050;
const isProd = process.env.NODE_ENV === 'production';

(async () => {
  try {
    await connectDB();
    await purgeExpiredOtps();

    if (!isProd) {
      const repaired = await repairMisplacedCaregivers(prisma);
      if (repaired > 0) {
        console.log(`Repaired ${repaired} misplaced caregiver location(s) on startup`);
      }
    }

    const server = http.createServer(app);

    const io = new Server(server, {
      cors: {
        origin: getCorsOrigins(),
        credentials: true,
      },
    });

    app.set('io', io);
    initSocket(io);

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `\nPort ${PORT} is already in use. Another API instance is running.\n` +
            `  Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n` +
            `  Or set a different PORT in backend/.env\n`
        );
        process.exit(1);
      }
      throw err;
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`API listening on http://localhost:${PORT}`);

      if (!isProd) {
        const lan = [];
        for (const nets of Object.values(os.networkInterfaces())) {
          for (const net of nets) {
            const v4 = net.family === 'IPv4' || net.family === 4;
            if (v4 && !net.internal) lan.push(`http://${net.address}:${PORT}`);
          }
        }
        if (lan.length) {
          console.log('  LAN URLs:');
          lan.forEach((url) => console.log(`    ${url}`));
        }
      }

      if (isProd) {
        if (isSmtpConfigured()) {
          console.log('  [mail] SMTP ready');
        } else {
          console.warn('  [mail] SMTP not configured — forgot-password will fail');
        }
      } else if (!isSmtpConfigured()) {
        console.log('  [mail] SMTP not configured (dev — OTP shown in terminal)');
      }
    });

    const shutdown = async () => {
      console.log('\nShutting down…');
      await prisma.$disconnect();
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled promise rejection:', reason);
      if (isProd) process.exit(1);
    });
  } catch (err) {
    console.error('\nFailed to start server:\n  ', err.message, '\n');
    process.exit(1);
  }
})();
