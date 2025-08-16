import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // Admin user
  const adminPass = await argon2.hash('Admin@123');
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@dhstore.rw',
      password: adminPass,
      role: 'ADMIN'
    }
  });

  // Categories
  const cat = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: { name: 'General' }
  });

  // Items
  await prisma.item.upsert({
    where: { sku: 'SKU-001' },
    update: {},
    create: {
      name: 'Sample Item',
      sku: 'SKU-001',
      quantity: 10,
      reorderLevel: 3,
      salePrice: 9.99,
      categoryId: cat.id
    }
  });

  console.log('Seed completed: admin/Admin@123 + sample data');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
