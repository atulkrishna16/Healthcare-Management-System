require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Supabase database with production staff & clinic data...');

  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 10);
  const doctorPassword = await bcrypt.hash(process.env.DOCTOR_PASSWORD || 'Doctor@1234', 10);
  const patientPassword = await bcrypt.hash('Patient@1234', 10);

  // ── 1. Executive Admin Account ──────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@clinic.com';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPassword },
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      name: process.env.ADMIN_NAME || 'Chief Medical Officer',
      role: 'admin',
    },
  });
  console.log(`✅ Admin account configured: ${adminEmail}`);

  // ── 2. Board-Certified Doctors ──────────────────────────────────────────────
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
    {
      name: 'Dr. Marcus Vance',
      email: 'marcus.vance@clinic.com',
      specialisation: 'Internal Medicine',
      slotDuration: 30,
      timezone: 'America/New_York',
    },
  ];

  const doctorProfiles = [];

  for (const doc of doctorsData) {
    const docUser = await prisma.user.upsert({
      where: { email: doc.email },
      update: { passwordHash: doctorPassword, name: doc.name },
      create: {
        email: doc.email,
        passwordHash: doctorPassword,
        name: doc.name,
        role: 'doctor',
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: docUser.id },
      update: {
        specialisation: doc.specialisation,
        slotDuration: doc.slotDuration,
        timezone: doc.timezone,
      },
      create: {
        userId: docUser.id,
        specialisation: doc.specialisation,
        slotDuration: doc.slotDuration,
        timezone: doc.timezone,
      },
    });

    doctorProfiles.push(profile);

    // Working hours: Mon-Fri, 9:00 AM - 5:00 PM
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorWorkingHours.upsert({
        where: { doctorId_dayOfWeek: { doctorId: profile.id, dayOfWeek: day } },
        update: { startTime: '09:00', endTime: '17:00' },
        create: {
          doctorId: profile.id,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      });
    }
    console.log(`✅ Doctor profile configured: ${doc.name} (${doc.email})`);
  }

  // ── 3. Registered Patients ──────────────────────────────────────────────────
  const patientsData = [
    { name: 'Eleanor Vance', email: 'eleanor.vance@gmail.com' },
    { name: 'Alice Johnson', email: 'alice.johnson@gmail.com' },
    { name: 'Bob Williams', email: 'bob.williams@gmail.com' },
  ];

  const patientUsers = [];

  for (const p of patientsData) {
    const patUser = await prisma.user.upsert({
      where: { email: p.email },
      update: { passwordHash: patientPassword, name: p.name },
      create: {
        email: p.email,
        passwordHash: patientPassword,
        name: p.name,
        role: 'patient',
      },
    });
    patientUsers.push(patUser);
  }
  console.log('✅ Patients registered.');

  // ── 4. Seed Realistic Initial Consultations ─────────────────────────────────
  const now = new Date();
  const primaryDoc = doctorProfiles[0];
  const primaryPat = patientUsers[0];

  const todayAt = (h, m = 0) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const tomorrowAt = (h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const appointmentsData = [
    {
      doctorId: primaryDoc.id,
      patientId: primaryPat.id,
      slotStart: todayAt(10, 0),
      slotEnd: todayAt(10, 30),
      status: 'confirmed',
      reason: 'Persistent palpitations and dizziness after mild morning cardio',
      urgency: 'Medium',
      chiefComplaint: 'Post-exercise tachycardia & lightheadedness',
      suggestedQuestions: [
        'How long do the palpitations last after cooling down?',
        'Any family history of early arrhythmias or cardiomyopathy?',
        'Are you consuming caffeine or pre-workout stimulants?'
      ],
    },
    {
      doctorId: primaryDoc.id,
      patientId: patientUsers[1].id,
      slotStart: todayAt(14, 0),
      slotEnd: todayAt(14, 30),
      status: 'confirmed',
      reason: 'Routine quarterly cardiovascular review and blood pressure check',
      urgency: 'Low',
      chiefComplaint: 'Routine hypertension follow-up on Lisinopril 10mg',
      suggestedQuestions: [
        'Any persistent dry cough since starting ACE inhibitor?',
        'What was your average home blood pressure reading this week?'
      ],
    },
    {
      doctorId: primaryDoc.id,
      patientId: patientUsers[2].id,
      slotStart: tomorrowAt(11, 0),
      slotEnd: tomorrowAt(11, 30),
      status: 'confirmed',
      reason: 'Follow-up on 24hr Holter telemetry and beta-blocker titration',
      urgency: 'Medium',
      chiefComplaint: 'Holter telemetry review for episodic SVT',
      suggestedQuestions: [
        'Did you experience syncopal episodes during Holter monitoring?',
        'Are you tolerating current Metoprolol dosage without bradycardia?'
      ],
    },
  ];

  for (const apptData of appointmentsData) {
    const appt = await prisma.appointment.upsert({
      where: {
        doctorId_slotStart: {
          doctorId: apptData.doctorId,
          slotStart: apptData.slotStart,
        },
      },
      update: { status: apptData.status },
      create: {
        doctorId: apptData.doctorId,
        patientId: apptData.patientId,
        slotStart: apptData.slotStart,
        slotEnd: apptData.slotEnd,
        status: apptData.status,
      },
    });

    await prisma.symptomForm.upsert({
      where: { appointmentId: appt.id },
      update: {
        symptoms: apptData.reason,
        aiSummary: {
          urgency: apptData.urgency,
          chiefComplaint: apptData.chiefComplaint,
          suggestedQuestions: apptData.suggestedQuestions,
        },
        aiStatus: 'ok',
      },
      create: {
        appointmentId: appt.id,
        symptoms: apptData.reason,
        aiSummary: {
          urgency: apptData.urgency,
          chiefComplaint: apptData.chiefComplaint,
          suggestedQuestions: apptData.suggestedQuestions,
        },
        aiStatus: 'ok',
      },
    });
  }

  console.log('✅ Initial appointments & AI intake summaries seeded.');
  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
