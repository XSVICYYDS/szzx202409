// /api/students - 学生 CRUD
import { json, err, parseBody, authUser } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // GET - 获取全部学生
  if (method === 'GET') {
    const results = await db.prepare('SELECT * FROM students ORDER BY student_no').all();
    return json(results.results || []);
  }

  // POST - 添加学生
  if (method === 'POST') {
    const user = await authUser(request, env);
    if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const body = await parseBody(request);
    if (!body.studentNo || !body.name) return err('请提供学号和姓名', 400);
    try {
      await db.prepare(
        'INSERT INTO students (student_no, name, bio, enrollment_year, avatar) VALUES (?, ?, ?, ?, ?)'
      ).bind(body.studentNo, body.name, body.bio || null, body.enrollment_year || 2024, body.avatar || null).run();
      return json({ ok: true });
    } catch (e) {
      return err('学号已存在', 400);
    }
  }

  // PUT - 更新学生
  if (method === 'PUT') {
    const user = await authUser(request, env);
    if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const body = await parseBody(request);
    if (!body.id) return err('请提供学生 ID', 400);

    const fields = [];
    const values = [];
    if (body.studentNo !== undefined) { fields.push('student_no=?'); values.push(body.studentNo); }
    if (body.name !== undefined) { fields.push('name=?'); values.push(body.name); }
    if (body.bio !== undefined) { fields.push('bio=?'); values.push(body.bio); }
    if (body.enrollment_year !== undefined) { fields.push('enrollment_year=?'); values.push(body.enrollment_year); }
    if (body.avatar !== undefined) { fields.push('avatar=?'); values.push(body.avatar); }
    if (fields.length === 0) return err('没有需要更新的字段', 400);
    values.push(body.id);
    await db.prepare(`UPDATE students SET ${fields.join(', ')} WHERE id=?`).bind(...values).run();
    return json({ ok: true });
  }

  // DELETE - 删除学生
  if (method === 'DELETE') {
    const user = await authUser(request, env);
    if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供学生 ID', 400);
    await db.prepare('DELETE FROM students WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}
