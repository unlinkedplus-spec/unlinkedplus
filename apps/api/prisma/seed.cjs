'use strict';

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const catalog = [
  { id: '47d05c48-ae4c-4ef2-8e30-000000000001', slug: 'id-card', name: 'ID Card', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000002', slug: 'kardus', name: 'Kardus', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000003', slug: 'kopi', name: 'Kopi', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000004', slug: 'bendera', name: 'Bendera', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000005', slug: 'kacamata', name: 'Kacamata', itemType: 'accessory', price: 10000, isPremium: true },
];

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    // Keep the existing password; only make sure the account can administer.
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: 'admin', status: 'active' },
    });
    console.log(`Admin account "${username}" already exists — role ensured.`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD || 'UnlinkedAdmin2026!';
  await prisma.user.create({
    data: {
      username,
      passwordHash: bcrypt.hashSync(password, 12),
      role: 'admin',
      status: 'active',
      profile: { create: { avatarConfig: { character: 'panda', accessories: [] } } },
    },
  });
  console.log(`Admin account "${username}" created. Change ADMIN_PASSWORD in .env for real deployments.`);
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

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
