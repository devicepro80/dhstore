import 'dotenv/config'
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import jwt from 'jsonwebtoken'
import argon2 from 'argon2'
import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
const FORCE_HTTPS = (process.env.FORCE_HTTPS || 'false') === 'true'

app.use(helmet())
app.use(express.json())
app.use(morgan('tiny'))
app.use(cors({ origin: [FRONTEND_ORIGIN], credentials: true }))

if (FORCE_HTTPS) {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect('https://' + req.headers.host + req.url)
    }
    next()
  })
}

app.get('/health', (_, res) => res.json({ ok: true }))

// Auth
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user || !(await argon2.verify(user.password, password))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = jwt.sign({ sub: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '12h' })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
})

function auth(requiredRole) {
  return (req, res, next) => {
    const auth = req.headers.authorization || ''
    const token = auth.replace('Bearer ', '')
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = payload
      if (requiredRole && !roleAllowed(payload.role, requiredRole)) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      next()
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }
}

function roleAllowed(userRole, requiredRole) {
  const order = { STAFF: 0, MANAGER: 1, ADMIN: 2 }
  return order[userRole] >= order[requiredRole]
}

// Users
app.get('/users', auth('ADMIN'), async (_, res) => {
  res.json(await prisma.user.findMany({ select: { id:true, username:true, role:true, email:true, createdAt:true } }))
})
app.post('/users', auth('ADMIN'), async (req, res) => {
  const { username, email, password, role } = req.body
  const hash = await argon2.hash(password || 'Password@123')
  const user = await prisma.user.create({ data: { username, email, password: hash, role: role || 'STAFF' } })
  res.json({ id: user.id, username: user.username, role: user.role })
})

// Categories
app.get('/categories', auth('STAFF'), async (_, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: 'asc' } }))
})
app.post('/categories', auth('MANAGER'), async (req, res) => {
  const { name } = req.body
  res.json(await prisma.category.create({ data: { name } }))
})

// Items
app.get('/items', auth('STAFF'), async (req, res) => {
  const q = req.query.q
  const where = q ? { OR:[{name:{contains:String(q), mode:'insensitive'}}, {sku:{contains:String(q), mode:'insensitive'}}] } : {}
  const items = await prisma.item.findMany({ where, include: { category:true } })
  res.json(items)
})
app.post('/items', auth('MANAGER'), async (req, res) => {
  const data = req.body
  const item = await prisma.item.create({ data })
  res.json(item)
})

// Email helper
async function sendLowStockEmail(item) {
  if (!process.env.SMTP_HOST) return
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  })
  const from = process.env.SMTP_FROM || 'no-reply@dhstore.rw'
  const to = process.env.SMTP_USER || from
  await transport.sendMail({
    from, to,
    subject: `Low stock alert: ${item.name}`,
    html: `<p><b>${item.name}</b> has low stock.</p><p>Qty: ${item.quantity} (reorder level: ${item.reorderLevel})</p><p>DH Store Inventory System</p>`
  }).catch(()=>{})
}

async function checkLowStockAndNotify(itemId) {
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (item && item.quantity <= item.reorderLevel) await sendLowStockEmail(item)
}

// Inventory transactions
app.post('/inventory/txn', auth('STAFF'), async (req, res) => {
  const { itemId, type, quantity, note } = req.body
  const qty = Number(quantity || 0)
  if (!itemId || !['IN','OUT','ADJUST'].includes(type) || !qty) return res.status(400).json({ error: 'Bad request' })
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return res.status(404).json({ error: 'Item not found' })

  let newQty = item.quantity
  if (type === 'IN') newQty += qty
  if (type === 'OUT') newQty -= qty
  if (type === 'ADJUST') newQty = qty

  const [txn, updated] = await prisma.$transaction([
    prisma.inventoryTxn.create({ data: { itemId, type, quantity: qty, note } }),
    prisma.item.update({ where: { id: itemId }, data: { quantity: newQty } })
  ])

  await checkLowStockAndNotify(itemId)
  res.json({ txn, item: updated })
})

// Sales
app.post('/sales', auth('STAFF'), async (req, res) => {
  const { itemId, quantity } = req.body
  const item = await prisma.item.findUnique({ where: { id: itemId } })
  if (!item) return res.status(404).json({ error: 'Item not found' })
  const qty = Number(quantity || 1)
  if (item.quantity < qty) return res.status(400).json({ error: 'Insufficient stock' })

  const amount = qty * item.salePrice
  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({ data: { itemId: item.id, quantity: qty, amount, userId: req.user.sub } })
    await tx.item.update({ where: { id: item.id }, data: { quantity: { decrement: qty } } })
    return s
  })
  await checkLowStockAndNotify(item.id)
  res.json(sale)
})

// Analytics
app.get('/analytics/overview', auth('MANAGER'), async (req, res) => {
  const since = new Date(Date.now() - 1000*60*60*24*30)
  const sales = await prisma.sale.findMany({ where: { createdAt: { gte: since } } })
  const byDay = {}
  for (const s of sales) {
    const d = s.createdAt.toISOString().slice(0,10)
    byDay[d] = (byDay[d] || 0) + s.amount
  }
  const days = [...Array(30)].map((_,i)=>{
    const d = new Date(Date.now()- (29-i)*86400000).toISOString().slice(0,10)
    return { date: d, amount: byDay[d] || 0 }
  })
  const items = await prisma.item.findMany()
  const lowStock = items.filter(it => it.quantity <= it.reorderLevel).length
  res.json({ salesByDay: days, lowStock })
})

app.get('/items/low-stock', auth('STAFF'), async (_, res) => {
  const items = await prisma.item.findMany()
  res.json(items.filter(it => it.quantity <= it.reorderLevel))
})

app.listen(PORT, () => console.log(`API running on :${PORT}`))
