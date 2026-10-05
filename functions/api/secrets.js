// /api/secrets - 密钥管理（管理员）
import { json, err, parseBody, authUser, getSecret, saveSecret } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const db = env.DB;
  const method = request.method;

  const user = await authUser(request, env);
  if (!user || user.role !== 'admin') return err('无权限，仅管理员可操作', 403);

  // POST - 保存密钥
  if (method === 'POST') {
    const body = await parseBody(request);
    if (body.openrouterKey) await saveSecret(db, 'openrouter_key', body.openrouterKey);
    if (body.githubToken) await saveSecret(db, 'github_token', body.githubToken);
    return json({ ok: true });
  }

  // GET - 检查密钥配置状态
  if (method === 'GET') {
    const [openrouterKey, githubToken] = await Promise.all([
      getSecret(db, 'openrouter_key'),
      getSecret(db, 'github_token'),
    ]);
    return json({
      hasOpenrouterKey: !!openrouterKey,
      hasGithubToken: !!githubToken,
    });
  }

  return err('不支持的方法', 405);
}
