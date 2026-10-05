// POST /api/login - 登录（管理员账号密码 / 学生学号）
import { json, err, hashPassword, signJWT, parseBody, SALT } from '../_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;
  const body = await parseBody(request);

  // 管理员登录
  if (body.username && body.password) {
    const user = await db.prepare('SELECT * FROM users WHERE username=?').first(body.username);
    if (!user) return err('用户名或密码错误', 401);

    if (user.locked_until && Date.now() < user.locked_until) {
      const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
      return err(`账号已被锁定，请 ${mins} 分钟后再试`, 403);
    }

    const hash = await hashPassword(body.password, SALT);
    if (hash !== user.password_hash) {
      const attempts = (user.failed_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      await db.prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?').bind(attempts, lockedUntil, user.id).run();
      if (attempts >= 5) return err('密码错误次数过多，账号已被锁定 15 分钟', 403);
      return err(`用户名或密码错误，还剩 ${5 - attempts} 次机会`, 401);
    }

    await db.prepare('UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?').bind(user.id).run();

    const token = await signJWT({
      sub: user.id, role: user.role, name: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }, env.JWT_SECRET);

    return json({ token, role: user.role, name: user.username });
  }

  // 学生登录
  if (body.studentNo) {
    const student = await db.prepare('SELECT * FROM students WHERE student_no=?').first(body.studentNo);
    if (!student) return err('学号不存在', 401);

    const token = await signJWT({
      sub: student.id, role: 'student', name: student.name, studentNo: student.student_no,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }, env.JWT_SECRET);

    return json({ token, role: 'student', name: student.name, studentNo: student.student_no });
  }

  return err('请提供登录凭证', 400);
}
