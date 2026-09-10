#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: node scripts/reset-admin-password.js <username> <newPassword>')
    process.exit(1)
  }
  const [username, newPassword] = args
  const prisma = new PrismaClient()
  try {
    const hash = await bcrypt.hash(newPassword, 10)
    const admin = await prisma.admin.upsert({
      where: { username },
      update: { passwordHash: hash },
      create: { username, passwordHash: hash }
    })
    console.log(`Admin ${username} password updated.`)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
