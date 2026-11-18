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
}

main()
  .catch((error) => {
    console.error('Avatar catalog seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
