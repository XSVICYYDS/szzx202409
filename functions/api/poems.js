// /api/poems - 诗歌 CRUD
import { json, err, parseBody, authUser } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // GET - 获取全部诗歌
  if (method === 'GET') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    const results = await db.prepare('SELECT * FROM poems ORDER BY created_at DESC').all();
    return json(results.results || []);
  }

  // POST - 添加诗歌
  if (method === 'POST') {
    const user = await authUser(request, env);
    if (!user) return err('请先登录', 401);
    const body = await parseBody(request);
    if (!body.title || !body.content) return err('请提供标题和内容', 400);
    const id = 'p' + Date.now();
    await db.prepare(
      'INSERT INTO poems (id, student_no, title, content, author, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime(\'now\'))'
    ).bind(
      id,
      body.studentNo || user.studentNo || null,
      body.title,
      body.content,
      body.author || user.name,
      body.status || (user.role === 'admin' ? 'approved' : 'pending')
    ).run();
    return json({ ok: true, id });
  }

  // PUT - 更新诗歌
  if (method === 'PUT') {
    const user = await authUser(request, env);
    if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const body = await parseBody(request);
    if (!body.id) return err('请提供诗歌 ID', 400);

    const fields = [];
    const values = [];
    if (body.title !== undefined) { fields.push('title=?'); values.push(body.title); }
    if (body.content !== undefined) { fields.push('content=?'); values.push(body.content); }
    if (body.author !== undefined) { fields.push('author=?'); values.push(body.author); }
    if (body.status !== undefined) { fields.push('status=?'); values.push(body.status); }
    if (body.studentNo !== undefined) { fields.push('student_no=?'); values.push(body.studentNo); }
    if (fields.length === 0) return err('没有需要更新的字段', 400);
    values.push(body.id);
    await db.prepare(`UPDATE poems SET ${fields.join(', ')} WHERE id=?`).bind(...values).run();
    return json({ ok: true });
  }

  // DELETE - 删除诗歌
  if (method === 'DELETE') {
    const user = await authUser(request, env);
    if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供诗歌 ID', 400);
    await db.prepare('DELETE FROM poems WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}
