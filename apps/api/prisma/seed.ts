import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog = [
  { id: '47d05c48-ae4c-4ef2-8e30-000000000001', slug: 'id-card', name: 'ID Card Miring', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000002', slug: 'kardus', name: 'Kardus Barang', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000003', slug: 'kopi', name: 'Kopi Galon', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000004', slug: 'bendera', name: 'Bendera Putih', itemType: 'accessory', price: 0, isPremium: false },
  { id: '47d05c48-ae4c-4ef2-8e30-000000000005', slug: 'kacamata', name: 'Kacamata Melorot', itemType: 'accessory', price: 10000, isPremium: true },
];

async function main() {
  await prisma.$transaction(catalog.map(({ id, slug, ...attributes }) =>
    prisma.avatarItem.upsert({
      where: { slug },
      create: { id, slug, ...attributes },
      update: attributes,
    }),
  ));
  console.log('Avatar catalog seeded with 5 items.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
