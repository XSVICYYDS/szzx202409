// POST /api/setup - 初始化数据库（仅首次可用）
import { json, err, hashPassword, parseBody, saveSecret, SALT } from '../_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const existing = await db.prepare('SELECT COUNT(*) as cnt FROM users').first();
  if (existing && existing.cnt > 0) {
    return err('数据库已初始化，不可重复设置', 400);
  }

  const body = await parseBody(request);
  if (!body.adminPassword) return err('请提供管理员密码', 400);

  const hash = await hashPassword(body.adminPassword, SALT);
  await db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .bind('szzx202409', hash, 'admin').run();

  if (body.openrouterKey) await saveSecret(db, 'openrouter_key', body.openrouterKey);
  if (body.githubToken) await saveSecret(db, 'github_token', body.githubToken);

  return json({ ok: true });
}
