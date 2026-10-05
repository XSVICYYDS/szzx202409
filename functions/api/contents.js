// /api/contents - 作品 CRUD
import { json, err, parseBody, authUser } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // GET - 获取全部作品（需登录）
  if (method === 'GET') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    const results = await db.prepare('SELECT * FROM contents ORDER BY created_at DESC').all();
    return json(results.results || []);
  }

  // POST - 提交作品
  if (method === 'POST') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    const body = await parseBody(request);
    if (!body.studentNo) return err('请提供学号', 400);
    if (!body.type) return err('请提供作品类型', 400);

    const id = 'c' + Date.now();
    await db.prepare(
      'INSERT INTO contents (id, student_no, type, title, description, file_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).bind(id, body.studentNo, body.type, body.title || '', body.description || '', body.fileUrl || null, 'pending').run();

    return json({ ok: true, id });
  }

  // PUT - 更新作品（管理员审批）
  if (method === 'PUT') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const body = await parseBody(request);
    if (!body.id) return err('请提供作品 ID', 400);

    const fields = [];
    const values = [];
    if (body.status !== undefined) { fields.push('status=?'); values.push(body.status); }
    if (body.title !== undefined) { fields.push('title=?'); values.push(body.title); }
    if (body.description !== undefined) { fields.push('description=?'); values.push(body.description); }
    if (body.fileUrl !== undefined) { fields.push('file_url=?'); values.push(body.fileUrl); }
    if (body.status !== undefined) {
      fields.push('reviewed_by=?'); values.push(user.name);
      fields.push('reviewed_at=?'); values.push(new Date().toISOString());
    }
    if (fields.length === 0) return err('没有需要更新的字段', 400);
    values.push(body.id);
    await db.prepare(`UPDATE contents SET ${fields.join(', ')} WHERE id=?`).bind(...values).run();
    return json({ ok: true });
  }

  // DELETE - 删除作品
  if (method === 'DELETE') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供作品 ID', 400);
    await db.prepare('DELETE FROM contents WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}
