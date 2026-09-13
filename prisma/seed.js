const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  // 创建管理员：使用您提供的管理员账号
  const adminUsername = 'szzx202409'
  const adminPassword = 'szzx202409'
  const hash = await bcrypt.hash(adminPassword, 10)
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash: hash },
    create: { username: adminUsername, passwordHash: hash }
  })

  // 创建 48 个示例学生，用户名规则：szzx2024NN，密码：Xs@09NN
  const students = []
  for (let i = 1; i <= 48; i++) {
    const suffix = String(i).padStart(2, '0') // 01,02,...,48
    const no = String(202409000 + i)
    const username = `szzx2024${suffix}`
    const rawPassword = `Xs@09${suffix}`
    const passwordHash = await bcrypt.hash(rawPassword, 10)
    students.push({ studentNo: no, username, name: `学生${i}`, bio: `这是学生${i}的简介`, passwordHash, mustChangePassword: true })
  }
  for (const s of students) {
    await prisma.student.upsert({ where: { studentNo: s.studentNo }, update: { username: s.username, passwordHash: s.passwordHash, mustChangePassword: true }, create: s })
  }

  console.log('seed finished')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
