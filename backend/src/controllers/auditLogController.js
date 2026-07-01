const prisma = require('../lib/prisma');

const MAX_PAGE_SIZE = 100;

exports.listAuditLogs = async (req, res) => {
  try {
    const take = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(String(req.query.limit || '50'), 10) || 50)
    );
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const action = req.query.action ? String(req.query.action) : null;

    const where = action ? { action } : undefined;

    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const logs = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? logs[logs.length - 1].id : null;

    return res.json({ logs, nextCursor });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Could not load audit logs' });
  }
};
