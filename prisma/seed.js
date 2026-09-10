const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 创建管理员
  const adminPassword = 'admin1234'
  const hash = await bcrypt.hash(adminPassword, 10)
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { passwordHash: hash },
    create: { username: 'admin', passwordHash: hash }
  })

  // 创建 48 个示例学生
  const students = []
  for (let i = 1; i <= 48; i++) {
    const no = String(202409000 + i)
    students.push({ studentNo: no, name: `学生${i}`, bio: `这是学生${i}的简介` })
  }
  for (const s of students) {
    await prisma.student.upsert({ where: { studentNo: s.studentNo }, update: {}, create: s })
  }

  console.log('seed finished')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
