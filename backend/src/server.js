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

(async () => {
  try {
    await connectDB();
    await purgeExpiredOtps();

    if (process.env.NODE_ENV !== 'production') {
      const repaired = await repairMisplacedCaregivers(prisma);
      if (repaired > 0) {
        console.log(`Repaired ${repaired} misplaced caregiver location(s) on startup`);
      }
    }

    const server = http.createServer(app);

    const careLayers = require('./routes/careServices').stack?.length;
    console.log(`Care-services admin routes mounted (router layers): ${careLayers ?? '?'}`);

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
      const lan = [];
      for (const nets of Object.values(os.networkInterfaces())) {
        for (const net of nets) {
          const v4 = net.family === 'IPv4' || net.family === 4;
          if (v4 && !net.internal) lan.push(`http://${net.address}:${PORT}`);
        }
      }
      if (lan.length) {
        console.log('  On your LAN (for direct API tests):');
        lan.forEach((url) => console.log(`    ${url}`));
      }
      console.log('  Frontend dev (use this on other devices): http://<your-pc-ip>:5173');
      if (process.env.NODE_ENV === 'production') {
        console.log('  [mail] SMTP configured for password reset emails.');
      } else if (!isSmtpConfigured()) {
        console.log(
          '  [mail] SMTP not configured — password reset codes print here and in the app (dev only).'
        );
        console.log('  [mail] Add SMTP_HOST, SMTP_USER, SMTP_PASS to backend/.env to send real email.');
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
      console.error('Unhandled promise rejection (API kept running):', reason);
    });
  } catch (err) {
    console.error('\nFailed to start server:\n  ', err.message, '\n');
    process.exit(1);
  }
})();
