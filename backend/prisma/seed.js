require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 12);
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@clinic.com' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@clinic.com',
      passwordHash: adminPassword,
      name: process.env.ADMIN_NAME || 'Super Admin',
      role: 'admin',
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // ── Doctors ───────────────────────────────────────────────────────────────
  const doctorsData = [
    {
      name: 'Dr. Sarah Mitchell',
      email: 'sarah.mitchell@clinic.com',
      specialisation: 'Cardiology',
      slotDuration: 30,
      timezone: 'America/New_York',
    },
    {
      name: 'Dr. James Patel',
      email: 'james.patel@clinic.com',
      specialisation: 'Neurology',
      slotDuration: 45,
      timezone: 'America/Chicago',
    },
    {
      name: 'Dr. Priya Sharma',
      email: 'priya.sharma@clinic.com',
      specialisation: 'General Practice',
      slotDuration: 20,
      timezone: 'America/Los_Angeles',
    },
  ];

  for (const doctorData of doctorsData) {
    const doctorPassword = await bcrypt.hash('Doctor@1234', 12);
    const doctorUser = await prisma.user.upsert({
      where: { email: doctorData.email },
      update: {},
      create: {
        email: doctorData.email,
        passwordHash: doctorPassword,
        name: doctorData.name,
        role: 'doctor',
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: doctorUser.id },
      update: {},
      create: {
        userId: doctorUser.id,
        specialisation: doctorData.specialisation,
        slotDuration: doctorData.slotDuration,
        timezone: doctorData.timezone,
      },
    });

    // Working hours: Mon-Fri, 9am-5pm
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorWorkingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId: profile.id, dayOfWeek: day } },
        update: {},
        create: {
          doctorId: profile.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      });
    }

    console.log(`✅ Doctor created: ${doctorData.name} (${doctorData.specialisation})`);
  }

  // ── Sample Patients ───────────────────────────────────────────────────────
  const patientsData = [
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Williams', email: 'bob@example.com' },
    { name: 'Carol Davis', email: 'carol@example.com' },
  ];

  for (const patient of patientsData) {
    const patientPassword = await bcrypt.hash('Patient@1234', 12);
    await prisma.user.upsert({
      where: { email: patient.email },
      update: {},
      create: {
        email: patient.email,
        passwordHash: patientPassword,
        name: patient.name,
        role: 'patient',
      },
    });
    console.log(`✅ Patient created: ${patient.name}`);
  }

  console.log('\n✨ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:   admin@clinic.com / Admin@1234');
  console.log('  Doctors: sarah.mitchell@clinic.com / Doctor@1234');
  console.log('           james.patel@clinic.com / Doctor@1234');
  console.log('           priya.sharma@clinic.com / Doctor@1234');
  console.log('  Patients: alice@example.com / Patient@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
