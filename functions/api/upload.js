// POST /api/upload - 文件上传到 GitHub
import { json, err, getSecret, authUser, DEFAULT_REPO, DEFAULT_BRANCH } from '../_utils.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB;

  const user = await authUser(request, env);
  if (!user) return err('请先登录', 401);

  const formData = await request.formData();
  const file = formData.get('file');
  const studentNo = formData.get('studentNo');
  if (!file) return err('请提供文件', 400);

  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) return err('文件大小不能超过 2MB', 400);

  const token = await getSecret(db, 'github_token');
  if (!token) return err('未配置 GitHub Token', 500);

  const name = file.name || 'unnamed';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const isImage = imageExts.includes(ext);
  const dir = isImage ? 'images' : 'docs';

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  const content = btoa(binary);

  const timestamp = Date.now();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${dir}/${studentNo ? studentNo + '-' : ''}${timestamp}-${safeName}`;

  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const ghRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: `upload ${name}`, content, branch }),
  });

  if (!ghRes.ok) {
    const ghErr = await ghRes.text();
    return err('GitHub 上传失败: ' + ghErr, 502);
  }

  const fileUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;
  return json({ url: fileUrl, path });
}
