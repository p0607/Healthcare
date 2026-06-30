/**
 * Reset caregiver coordinates corrupted by emulator US GPS.
 * Run: npm run db:fix-locations
 */
require('dotenv').config();
const prisma = require('../src/lib/prisma');
const { repairMisplacedCaregivers } = require('../src/lib/caregiverLocation');

(async () => {
  try {
    const reset = await repairMisplacedCaregivers(prisma);
    console.log(reset ? `Reset ${reset} caregiver(s).` : 'No misplaced caregivers found.');
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
