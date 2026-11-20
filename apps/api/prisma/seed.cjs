'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const catalog = [
  { id: '47d05c48-ae4c-4ef2-8e30-000000000001', slug: 'id-card', name: 'ID Card', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000002', slug: 'kardus', name: 'Kardus', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000003', slug: 'kopi', name: 'Kopi', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000004', slug: 'bendera', name: 'Bendera', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000005', slug: 'kacamata', name: 'Kacamata', itemType: 'accessory', price: 10000, isPremium: true },
];

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

  const pollCount = await prisma.poll.count();
  if (pollCount === 0) {
    const polls = [
      {
        question: 'Kalau gajian telat, kamu biasanya?',
        options: ['Tetap kerja, gajian kan tetap masuk', 'Pura-pura sibuk biar enggak disuruh lembur', 'Langsung komplain ke atasan', 'Udah males, ikut-ikutan aja'],
      },
      {
        question: 'Antara WFH atau datang ke kantor, pilihanmu?',
        options: ['WFH: bebas atur waktu', 'Kantor: biar ada batas kerja', 'Hybrid saja yang penting jelas', 'Tergantung mood dan proyek'],
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
    console.error('Avatar catalog seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
