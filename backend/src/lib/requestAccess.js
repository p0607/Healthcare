const prisma = require('./prisma');

/** True if user may join Socket room or receive live updates for this request. */
async function canAccessRequest(user, requestId) {
  if (!user?.id || !requestId) return false;
  if (user.role === 'admin') return true;

  const request = await prisma.serviceRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, nurseId: true },
  });
  if (!request) return false;
  if (request.userId === user.id) return true;
  if (request.nurseId === user.id) return true;
  return false;
}

module.exports = { canAccessRequest };
