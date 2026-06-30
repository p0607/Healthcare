const prisma = require('../src/lib/prisma');
const { toSafeUser } = require('../src/lib/format');

(async () => {
  const email = process.argv[2] || 'ndoc@alchemy.com';
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      nurseCareOfferings: {
        include: { careServiceOption: { select: { label: true, serviceType: true } } },
      },
    },
  });
  if (!user) {
    console.log('User not found:', email);
    return;
  }
  console.log('User table (User):', {
    id: user.id,
    email: user.email,
    role: user.role,
    visitRate: user.visitRate,
  });
  console.log('Rows in NurseCareOffering (sub-services):', user.nurseCareOfferings.length);
  user.nurseCareOfferings.forEach((r) => {
    console.log(' -', r.careServiceOption?.label, '| rate:', r.rate, '| optionId:', r.careServiceOptionId);
  });
  console.log('API shape (careOfferings):', JSON.stringify(toSafeUser(user).careOfferings, null, 2));
  await prisma.$disconnect();
})();
