require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Supabase database with realistic clinical data...');

  const defaultPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@1234', 10);

  // ── 1. Admin Users ──────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { passwordHash: defaultPassword },
    create: {
      email: 'admin@demo.com',
      passwordHash: defaultPassword,
      name: 'Dr. Arthur Pendelton (Chief Medical Officer)',
      role: 'admin',
    },
  });

  await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@clinic.com' },
    update: { passwordHash: adminPassword },
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@clinic.com',
      passwordHash: adminPassword,
      name: process.env.ADMIN_NAME || 'Super Admin',
      role: 'admin',
    },
  });
  console.log('✅ Admin accounts created (admin@demo.com, admin@clinic.com)');

  // ── 2. Doctors ──────────────────────────────────────────────────────────────
  const doctorsData = [
    {
      name: 'Dr. Sarah Mitchell',
      email: 'doctor@demo.com', // Primary Demo Doctor
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
      email: 'sarah.mitchell@clinic.com',
      specialisation: 'Internal Medicine',
      slotDuration: 30,
      timezone: 'America/New_York',
    },
  ];

  const doctorProfiles = [];

  for (const doc of doctorsData) {
    const docUser = await prisma.user.upsert({
      where: { email: doc.email },
      update: { passwordHash: defaultPassword },
      create: {
        email: doc.email,
        passwordHash: defaultPassword,
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
    console.log(`✅ Doctor created: ${doc.name} (${doc.specialisation})`);
  }

  // ── 3. Patients ─────────────────────────────────────────────────────────────
  const patientsData = [
    { name: 'Eleanor Vance', email: 'patient@demo.com' }, // Primary Demo Patient
    { name: 'Alice Johnson', email: 'alice@example.com' },
    { name: 'Bob Williams', email: 'bob@example.com' },
    { name: 'Carol Davis', email: 'carol@example.com' },
  ];

  const patientUsers = [];

  for (const p of patientsData) {
    const patUser = await prisma.user.upsert({
      where: { email: p.email },
      update: { passwordHash: defaultPassword },
      create: {
        email: p.email,
        passwordHash: defaultPassword,
        name: p.name,
        role: 'patient',
      },
    });
    patientUsers.push(patUser);
    console.log(`✅ Patient created: ${p.name}`);
  }

  // ── 4. Seed Realistic Clinical Appointments ─────────────────────────────────
  const now = new Date();
  const demoDoctor = doctorProfiles[0];
  const demoPatient = patientUsers[0];

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
  const daysAheadAt = (days, h, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const appointmentsData = [
    {
      doctorId: demoDoctor.id,
      patientId: demoPatient.id,
      slotStart: todayAt(10, 0),
      slotEnd: todayAt(10, 30),
      status: 'confirmed',
      reason: 'Persistent palpitations and dizziness after mild morning cardio',
      urgency: 'medium',
      chiefComplaint: 'Post-exercise tachycardia & lightheadedness',
      suggestedQuestions: [
        'How long do the palpitations last after cooling down?',
        'Any family history of early arrhythmias or cardiomyopathy?',
        'Are you consuming caffeine or pre-workout stimulants?'
      ],
    },
    {
      doctorId: demoDoctor.id,
      patientId: patientUsers[1].id,
      slotStart: todayAt(14, 0),
      slotEnd: todayAt(14, 30),
      status: 'confirmed',
      reason: 'Routine quarterly cardiovascular review and blood pressure check',
      urgency: 'low',
      chiefComplaint: 'Routine hypertension follow-up on Lisinopril 10mg',
      suggestedQuestions: [
        'Any persistent dry cough since starting ACE inhibitor?',
        'What was your average home blood pressure reading this week?'
      ],
    },
    {
      doctorId: demoDoctor.id,
      patientId: patientUsers[2].id,
      slotStart: tomorrowAt(11, 0),
      slotEnd: tomorrowAt(11, 30),
      status: 'confirmed',
      reason: 'Follow-up on 24hr Holter telemetry and beta-blocker titration',
      urgency: 'medium',
      chiefComplaint: 'Holter telemetry review & fatigue check',
      suggestedQuestions: [
        'Did you feel any dizziness or shortness of breath during the monitoring period?'
      ],
    },
    {
      doctorId: doctorProfiles[1].id,
      patientId: demoPatient.id,
      slotStart: daysAheadAt(3, 15, 0),
      slotEnd: daysAheadAt(3, 15, 45),
      status: 'confirmed',
      reason: 'Recurring unilateral migraine headaches with visual aura',
      urgency: 'high',
      chiefComplaint: 'Throbbing hemicranial pain with scintillating scotoma 3x weekly',
      suggestedQuestions: [
        'How quickly does your aura precede the headache phase?',
        'Have you noticed any sensory numbness or speech difficulty?'
      ],
    },
    {
      doctorId: demoDoctor.id,
      patientId: patientUsers[3].id,
      slotStart: daysAheadAt(5, 9, 30),
      slotEnd: daysAheadAt(5, 10, 0),
      status: 'confirmed',
      reason: 'Pre-operative cardiac clearance for elective meniscus repair',
      urgency: 'low',
      chiefComplaint: 'Pre-op cardiac risk assessment',
      suggestedQuestions: [
        'Can you walk up two flights of stairs without stopping for breath?'
      ],
    },
  ];

  for (const appt of appointmentsData) {
    const existing = await prisma.appointment.findFirst({
      where: { doctorId: appt.doctorId, slotStart: appt.slotStart },
    });

    if (!existing) {
      const createdAppt = await prisma.appointment.create({
        data: {
          doctorId: appt.doctorId,
          patientId: appt.patientId,
          slotStart: appt.slotStart,
          slotEnd: appt.slotEnd,
          status: appt.status,
          symptomForm: {
            create: {
              symptoms: appt.reason,
              aiStatus: 'ok',
              aiSummary: {
                urgency: appt.urgency,
                chiefComplaint: appt.chiefComplaint,
                suggestedQuestions: appt.suggestedQuestions,
              },
            },
          },
        },
      });

      console.log(`✅ Appointment created with AI triage: ${appt.slotStart.toISOString().slice(0, 16)} (${appt.urgency} urgency)`);
    }
  }

  console.log('\n✨ Database seeding completed successfully!');
  console.log('──────────────────────────────────────────────────');
  console.log('📌 Quick One-Click Demo Credentials (Password: password123):');
  console.log('  • Patient: patient@demo.com');
  console.log('  • Doctor:  doctor@demo.com');
  console.log('  • Admin:   admin@demo.com');
  console.log('──────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
