/**
 * Integration Test: Double-Booking Prevention Under Concurrent Requests
 *
 * Tests that two simultaneous hold requests for the same doctor+slot
 * result in exactly ONE success (201) and ONE failure (409).
 *
 * Run: npm test -- --testPathPattern=concurrency
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/utils/prismaClient');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let testDoctorId;
let testPatient1Token;
let testPatient2Token;
let testSlotStart;

beforeAll(async () => {
  // ── Create test doctor ─────────────────────────────────────────────────────
  const doctorPassword = await bcrypt.hash('test_password', 10);
  const doctorUser = await prisma.user.create({
    data: {
      email: `test_doctor_${Date.now()}@test.com`,
      passwordHash: doctorPassword,
      name: 'Test Doctor Concurrency',
      role: 'doctor',
    },
  });

  const doctorProfile = await prisma.doctorProfile.create({
    data: {
      userId: doctorUser.id,
      specialisation: 'General',
      slotDuration: 30,
      timezone: 'UTC',
    },
  });
  testDoctorId = doctorProfile.id;

  // ── Create test patients ───────────────────────────────────────────────────
  const makePatient = async (idx) => {
    const hash = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: `test_patient_${idx}_${Date.now()}@test.com`,
        passwordHash: hash,
        name: `Test Patient ${idx}`,
        role: 'patient',
      },
    });
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_ACCESS_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  };

  [testPatient1Token, testPatient2Token] = await Promise.all([makePatient(1), makePatient(2)]);

  // ── Set test slot (tomorrow at 10am UTC) ──────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(10, 0, 0, 0);
  testSlotStart = tomorrow.toISOString();
}, 30000);

afterAll(async () => {
  // Cleanup test data
  await prisma.appointment.deleteMany({
    where: { doctorId: testDoctorId },
  });
  await prisma.doctorProfile.delete({ where: { id: testDoctorId } });
  await prisma.$disconnect();
});

test(
  'Two concurrent hold requests for same slot: exactly one succeeds, one gets 409',
  async () => {
    // Fire both requests simultaneously
    const [result1, result2] = await Promise.all([
      request(app)
        .post('/appointments/hold')
        .set('Authorization', `Bearer ${testPatient1Token}`)
        .send({ doctorId: testDoctorId, slotStart: testSlotStart }),
      request(app)
        .post('/appointments/hold')
        .set('Authorization', `Bearer ${testPatient2Token}`)
        .send({ doctorId: testDoctorId, slotStart: testSlotStart }),
    ]);

    const statuses = [result1.status, result2.status].sort();

    console.log('Result 1:', result1.status, result1.body.error || 'OK');
    console.log('Result 2:', result2.status, result2.body.error || 'OK');

    // Exactly one should succeed (201) and one should fail (409)
    expect(statuses).toEqual([201, 409]);

    // Verify DB has exactly one held appointment for this slot
    const count = await prisma.appointment.count({
      where: {
        doctorId: testDoctorId,
        slotStart: new Date(testSlotStart),
        status: 'held',
      },
    });
    expect(count).toBe(1);
  },
  30000
);

test(
  'Third concurrent request for same slot also gets 409',
  async () => {
    // The slot should already be held from the previous test
    const result = await request(app)
      .post('/appointments/hold')
      .set('Authorization', `Bearer ${testPatient1Token}`)
      .send({ doctorId: testDoctorId, slotStart: testSlotStart });

    expect(result.status).toBe(409);
    expect(result.body.error).toMatch(/slot no longer available/i);
  },
  10000
);
