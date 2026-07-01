const jwt = require('jsonwebtoken');
const prisma = require('./lib/prisma');
const { canAccessRequest } = require('./lib/requestAccess');

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return next(new Error('User not found'));
    if (!user.accountActive) return next(new Error('Account inactive'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Authentication failed'));
  }
};

const initSocket = (io) => {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const u = socket.user;
    console.log(`socket connected: ${u.email} (${u.role})`);

    socket.join(`user:${u.id}`);
    if (u.role === 'nurse') socket.join('nurses');
    if (u.role === 'admin') socket.join('admins');

    socket.on('request:join', async (requestId) => {
      if (!requestId || typeof requestId !== 'string') return;
      try {
        const allowed = await canAccessRequest(u, requestId);
        if (!allowed) {
          console.warn(`socket denied request:join user=${u.id} request=${requestId}`);
          return;
        }
        socket.join(`request:${requestId}`);
      } catch {
        /* non-fatal */
      }
    });

    socket.on('nurse:location', async ({ requestId, coordinates }) => {
      if (u.role !== 'nurse') return;

      if (requestId) {
        const allowed = await canAccessRequest(u, requestId);
        if (!allowed) return;
      }

      if (Array.isArray(coordinates) && coordinates.length === 2) {
        const lng = Number(coordinates[0]);
        const lat = Number(coordinates[1]);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          try {
            await prisma.user.update({
              where: { id: u.id },
              data: { lng, lat },
            });
          } catch {
            /* non-fatal */
          }
        }
      }

      if (requestId) {
        io.to(`request:${requestId}`).emit('nurse:location', {
          requestId,
          nurseId: u.id,
          coordinates,
          at: Date.now(),
        });
      }

      io.to('admins').emit('nurse:location', {
        nurseId: u.id,
        coordinates,
        at: Date.now(),
      });
    });
  });
};

module.exports = initSocket;
