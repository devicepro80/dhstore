import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()
async function main() {
  const adminPass = await argon2.hash('Admin@123')
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { email: 'admin@dhstore.rw', username: 'admin', password: adminPass, role: 'ADMIN' }
  })
  for (const name of ['Beverages','Snacks','Household','Personal Care']) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } })
  }
  const tea = await prisma.item.upsert({
    where: { sku: 'TEA-001' },
    update: {},
    create: { name:'Black Tea 250g', sku:'TEA-001', quantity:50, reorderLevel:10, purchasePrice:2.0, salePrice:3.5, category: { connect: { name: 'Beverages' } } }
  })
  await prisma.inventoryTxn.create({ data: { itemId: tea.id, type:'IN', quantity:50, note:'Initial stock' } })
  console.log('Seed complete. Admin: admin / Admin@123')
}
main().then(()=>prisma.$disconnect()).catch(e=>{console.error(e); process.exit(1)})
