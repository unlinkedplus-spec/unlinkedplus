'use strict';

const bcrypt = require('bcryptjs');
const { randomBytes } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const catalog = [
  { id: '47d05c48-ae4c-4ef2-8e30-000000000001', slug: 'id-card', name: 'ID Card', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000002', slug: 'kardus', name: 'Kardus', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000003', slug: 'kopi', name: 'Kopi', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000004', slug: 'bendera', name: 'Bendera', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000005', slug: 'kacamata', name: 'Kacamata', itemType: 'accessory', price: 10000, isPremium: true },
];

async function seedAdmin(client = prisma, env = process.env, log = console.log) {
  const username = String(env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const existing = await client.user.findUnique({ where: { username } });
  if (existing) {
    // Never grant admin rights to an account that was registered by a user.
    // Only an account already carrying the admin role is considered legitimate.
    if (existing.role !== 'admin') {
      throw new Error(
        `Refusing to promote existing account "${username}" to admin. ` +
        `Choose a different ADMIN_USERNAME or promote it manually after identity verification.`,
      );
    }
    // Keep the existing password — seeding must never reset a real admin password.
    await client.user.update({
      where: { id: existing.id },
      data: { status: 'active' },
    });
    log(`Admin account "${username}" already exists — status ensured.`);
    return;
  }

  // There is deliberately no guessable fallback password. If the operator did
  // not provide one, generate a high-entropy password and print it exactly once.
  const generated = !env.ADMIN_PASSWORD;
  const password = generated ? randomBytes(24).toString('hex') : String(env.ADMIN_PASSWORD);
  if (password.length < 12 || /changeme|example|replace/i.test(password)) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters and must not be a placeholder.');
  }
  await client.user.create({
    data: {
      username,
      passwordHash: bcrypt.hashSync(password, 12),
      role: 'admin',
      status: 'active',
      profile: { create: { avatarConfig: { character: 'panda', accessories: [] } } },
    },
  });
  if (generated) {
    log(`Admin account "${username}" created with a generated password: ${password}`);
    log('Save this password now — it is not printed again. Set ADMIN_PASSWORD in .env to control it explicitly.');
  } else {
    log(`Admin account "${username}" created from ADMIN_PASSWORD.`);
  }
}

async function main() {
  await prisma.$transaction(catalog.map(({ id, slug, ...attributes }) =>
    prisma.avatarItem.upsert({
      where: { slug },
      create: { id, slug, ...attributes },
      // Preserve existing IDs because inventory and transactions may reference them.
      update: attributes,
    }),
  ));
  console.log('Avatar catalog seeded. No users, posts, or purchases were created.');

  await seedAdmin();

  const pollCount = await prisma.poll.count();
  if (pollCount === 0) {
    const polls = [
      {
        question: 'Kalau gajian telat, kamu biasa?',
        options: ['Tetap kerja, gajian kan tetap masuk', 'Pura-pura sibuk biar enggak disuruh lembur', 'Langsung komplain ke atasan', 'Udah males, ikut-ikutan aja'],
      },
      {
        question: 'Antara WFH atau datang ke kantor, pilihanmu?',
        options: ['WFH: bebas bekerja dari mana saja', 'Kantor: biar ada batas kerja', 'Hybrid saja yang penting jelas', 'Tergantung mood dan proyek'],
      },
    ];
    for (const poll of polls) {
      await prisma.poll.create({
        data: {
          question: poll.question,
          endsAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          options: { create: poll.options.map((label, position) => ({ label, position })) },
        },
      });
    }
    console.log(`${polls.length} starter polls seeded.`);
  }
}

module.exports = { seedAdmin, catalog };

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
