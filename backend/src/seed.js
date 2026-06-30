/**
 * Seed script: creates a default admin, a few nurses, and a demo user.
 * Run: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./lib/prisma');

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'admin@alchemy.com').toLowerCase();

const seedData = [
  {
    name: 'Alchemy Admin',
    email: 'admin@alchemy.com',
    password: 'admin123',
    role: 'admin',
    adminTier: 'super_admin',
    accountKinds: [],
    phone: '+910000000001',
    lng: 77.5946,
    lat: 12.9716,
    address: 'Bengaluru HQ',
  },
  {
    name: 'Nurse Priya',
    email: 'priya@nurse.com',
    password: 'nurse123',
    role: 'nurse',
    caregiverCategory: 'nurse_visit',
    phone: '+910000000002',
    specialization: 'General Nursing',
    licenseNumber: 'RN-1001',
    rating: 4.9,
    visitRate: 599,
    lng: 77.594,
    lat: 12.971,
    address: 'MG Road, Bengaluru',
  },
  {
    name: 'Dr. Rohan',
    email: 'rohan@doctor.com',
    password: 'doctor123',
    role: 'nurse',
    caregiverCategory: 'doctor_consult',
    phone: '+910000000003',
    specialization: 'General Physician',
    licenseNumber: 'MD-2002',
    rating: 4.8,
    visitRate: 899,
    lng: 77.61,
    lat: 12.978,
    address: 'Indiranagar, Bengaluru',
  },
  {
    name: 'Nurse Anjali',
    email: 'anjali@nurse.com',
    password: 'nurse123',
    role: 'nurse',
    caregiverCategory: 'nurse_visit',
    phone: '+910000000004',
    specialization: 'Elderly Care',
    licenseNumber: 'RN-1003',
    rating: 4.7,
    visitRate: 649,
    lng: 77.58,
    lat: 12.93,
    address: 'Jayanagar, Bengaluru',
  },
  {
    name: 'Demo User',
    email: 'user@demo.com',
    password: 'user1234',
    role: 'user',
    phone: '+910000000005',
    lng: 77.5946,
    lat: 12.9716,
    address: 'Bengaluru',
  },
];

(async () => {
  try {
    for (const data of seedData) {
      const exists = await prisma.user.findUnique({ where: { email: data.email } });
      if (exists) {
        console.log(`skip (exists): ${data.email}`);
        continue;
      }
      const hashed = await bcrypt.hash(data.password, 10);
      const user = await prisma.user.create({
        data: { ...data, password: hashed },
      });
      console.log(`created ${user.role}: ${user.email}`);
    }

    await prisma.user.updateMany({
      where: { email: SUPER_ADMIN_EMAIL, role: 'admin' },
      data: { adminTier: 'super_admin', accountKinds: [] },
    });
    await prisma.user.updateMany({
      where: { role: 'admin', adminTier: null },
      data: { adminTier: 'admin', accountKinds: [] },
    });

    console.log('\nSeed complete. Default credentials:');
    console.log(`  SUPER ADMIN -> ${SUPER_ADMIN_EMAIL} / admin123`);
    console.log('  NURSE  -> priya@nurse.com  / nurse123');
    console.log('  NURSE  -> rohan@doctor.com / doctor123');
    console.log('  USER   -> user@demo.com    / user1234');

    const DEFAULT_OPTIONS = [
      'Injection or vaccination at home',
      'IV fluids or medication administration',
      'Wound dressing and bandage change',
      'Post-operative or surgical site care',
      'Vital signs and glucose monitoring',
      'Bedside elderly care assistance',
      'Catheter or stoma basic care',
      'Physiotherapy exercise supervision',
      'General nursing assessment',
      'Pregnancy or postnatal check support',
      'Respiratory or nebulisation support',
      'Sample collection support',
      'Other — details in notes',
    ];
    const optCount = await prisma.careServiceOption.count();
    if (optCount === 0) {
      await prisma.careServiceOption.createMany({
        data: DEFAULT_OPTIONS.map((label, i) => ({
          label,
          sortOrder: i,
          serviceType: 'nurse_visit',
          rate: 249 + (i % 8) * 75,
        })),
      });
      console.log(`created ${DEFAULT_OPTIONS.length} default visit-focus options`);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
})();
