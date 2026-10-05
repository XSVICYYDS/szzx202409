// ============================================
// 尚志中学2024届09班 - 主 API 路由 (catch-all)
// 处理所有 /api/* 请求
// ============================================

const SALT = 'szzx202409-salt';
const DEFAULT_REPO = 'szzx202409/szzx202409';
const DEFAULT_BRANCH = 'main';

// ============================================
// 共享工具函数
// ============================================

// JWT 签名（使用 Web Crypto API）
async function signJWT(payload, secret) {
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const data = header + '.' + payloadB64;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return data + '.' + sigB64;
}

// JWT 验证
async function verifyJWT(token, secret) {
  const [h, p, s] = token.split('.');
  if (!h || !p || !s) return null;
  const data = h + '.' + p;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sig, enc.encode(data));
  if (!valid) return null;
  const payload = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp && Date.now() > payload.exp) return null;
  return payload;
}

// 密码哈希：SHA-256(salt + password)
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(salt + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 响应工具
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
}

// 密钥存储（分段 Base64）
async function getSecret(db, name) {
  const row = await db.prepare('SELECT part1,part2,part3 FROM secrets WHERE key_name=?').first(name);
  if (!row) return null;
  return (row.part1 ? atob(row.part1) : '') + (row.part2 ? atob(row.part2) : '') + (row.part3 ? atob(row.part3) : '');
}

function makeParts(value) {
  const len = value.length;
  const s1 = Math.ceil(len / 3), s2 = Math.ceil(len * 2 / 3);
  return [btoa(value.slice(0, s1)), btoa(value.slice(s1, s2)), btoa(value.slice(s2))];
}

async function saveSecret(db, name, value) {
  const [p1, p2, p3] = makeParts(value);
  await db.prepare(
    'INSERT INTO secrets (key_name, part1, part2, part3, updated_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ' +
    'ON CONFLICT(key_name) DO UPDATE SET part1=excluded.part1, part2=excluded.part2, part3=excluded.part3, updated_at=datetime(\'now\')'
  ).bind(name, p1, p2, p3).run();
}

// 解析请求体
async function parseBody(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

// ============================================
// 公开路由处理
// ============================================

// POST /api/login - 登录
async function handleLogin(context) {
  const { request, env } = context;
  const body = await parseBody(request);
  const db = env.DB;

  // 管理员登录：body={username, password}
  if (body.username && body.password) {
    const user = await db.prepare('SELECT * FROM users WHERE username=?').first(body.username);
    if (!user) return err('用户名或密码错误', 401);

    // 检查锁定状态
    if (user.locked_until && Date.now() < user.locked_until) {
      const mins = Math.ceil((user.locked_until - Date.now()) / 60000);
      return err(`账号已被锁定，请 ${mins} 分钟后再试`, 403);
    }

    const hash = await hashPassword(body.password, SALT);
    if (hash !== user.password_hash) {
      // 失败次数 +1，5 次锁定 15 分钟
      const attempts = (user.failed_attempts || 0) + 1;
      const lockedUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      await db.prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?')
        .bind(attempts, lockedUntil, user.id).run();
      if (attempts >= 5) return err('密码错误次数过多，账号已被锁定 15 分钟', 403);
      return err(`用户名或密码错误，还剩 ${5 - attempts} 次机会`, 401);
    }

    // 登录成功，重置失败次数
    await db.prepare('UPDATE users SET failed_attempts=0, locked_until=0 WHERE id=?').bind(user.id).run();

    const token = await signJWT({
      sub: user.id,
      role: user.role,
      name: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }, env.JWT_SECRET);

    return json({ token, role: user.role, name: user.username });
  }

  // 学生登录：body={studentNo}
  if (body.studentNo) {
    const student = await db.prepare('SELECT * FROM students WHERE student_no=?').first(body.studentNo);
    if (!student) return err('学号不存在', 401);

    const token = await signJWT({
      sub: student.id,
      role: 'student',
      name: student.name,
      studentNo: student.student_no,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }, env.JWT_SECRET);

    return json({ token, role: 'student', name: student.name, studentNo: student.student_no });
  }

  return err('请提供登录凭证', 400);
}

// POST /api/setup - 初始化数据库（仅首次可用）
async function handleSetup(context) {
  const { request, env } = context;
  const db = env.DB;

  // 检查 users 表是否已有数据
  const existing = await db.prepare('SELECT COUNT(*) as cnt FROM users').first();
  if (existing && existing.cnt > 0) {
    return err('数据库已初始化，不可重复设置', 400);
  }

  const body = await parseBody(request);
  if (!body.adminPassword) return err('请提供管理员密码', 400);

  // 创建管理员账号
  const hash = await hashPassword(body.adminPassword, SALT);
  await db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .bind('szzx202409', hash, 'admin').run();

  // 存储密钥到 secrets 表（分段 Base64）
  if (body.openrouterKey) await saveSecret(db, 'openrouter_key', body.openrouterKey);
  if (body.githubToken) await saveSecret(db, 'github_token', body.githubToken);

  return json({ ok: true });
}

// GET /api/data - 获取公开数据
async function handleData(context) {
  const { env } = context;
  const db = env.DB;

  const [configRows, students, contents, poems, scheduleRow] = await Promise.all([
    db.prepare('SELECT key, value FROM config').all(),
    db.prepare('SELECT id, student_no, name, bio, enrollment_year, avatar FROM students ORDER BY student_no').all(),
    db.prepare('SELECT * FROM contents WHERE status=? ORDER BY created_at DESC').bind('approved').all(),
    db.prepare("SELECT * FROM poems WHERE status IN ('approved','published') ORDER BY created_at DESC").all(),
    db.prepare('SELECT value FROM config WHERE key=?').bind('schedule').first(),
  ]);

  const config = {};
  if (configRows.results) {
    for (const row of configRows.results) {
      config[row.key] = row.value;
    }
  }

  let schedule = null;
  if (scheduleRow && scheduleRow.value) {
    try { schedule = JSON.parse(scheduleRow.value); } catch (e) { schedule = null; }
  }

  return json({
    config,
    students: students.results || [],
    contents: contents.results || [],
    poems: poems.results || [],
    schedule,
  });
}

// ============================================
// 鉴权路由 - 作品 contents
// ============================================
async function handleContents(context) {
  const { request, env, user } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // GET - 获取全部作品（含待审批，需登录）
  if (method === 'GET') {
    const results = await db.prepare('SELECT * FROM contents ORDER BY created_at DESC').all();
    return json(results.results || []);
  }

  // POST - 提交作品（学生或管理员）
  if (method === 'POST') {
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

  // DELETE - 删除作品（管理员）
  if (method === 'DELETE') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供作品 ID', 400);
    await db.prepare('DELETE FROM contents WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}

// ============================================
// 鉴权路由 - 学生 students
// ============================================
async function handleStudents(context) {
  const { request, env, user } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // POST - 添加学生（管理员）
  if (method === 'POST') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const body = await parseBody(request);
    if (!body.studentNo || !body.name) return err('请提供学号和姓名', 400);
    try {
      await db.prepare(
        'INSERT INTO students (student_no, name, bio, enrollment_year, avatar) VALUES (?, ?, ?, ?, ?)'
      ).bind(body.studentNo, body.name, body.bio || null, body.enrollment_year || 2024, body.avatar || null).run();
      return json({ ok: true });
    } catch (e) {
      return err('学号已存在: ' + e.message, 400);
    }
  }

  // PUT - 更新学生（管理员）
  if (method === 'PUT') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
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

  // DELETE - 删除学生（管理员）
  if (method === 'DELETE') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供学生 ID', 400);
    await db.prepare('DELETE FROM students WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}

// ============================================
// 鉴权路由 - 诗歌 poems
// ============================================
async function handlePoems(context) {
  const { request, env, user } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  // GET - 获取全部诗歌（含待审批）
  if (method === 'GET') {
    const results = await db.prepare('SELECT * FROM poems ORDER BY created_at DESC').all();
    return json(results.results || []);
  }

  // POST - 添加诗歌
  if (method === 'POST') {
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
      'pending'
    ).run();
    return json({ ok: true, id });
  }

  // PUT - 更新诗歌（管理员）
  if (method === 'PUT') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
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

  // DELETE - 删除诗歌（管理员）
  if (method === 'DELETE') {
    if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);
    const id = url.searchParams.get('id');
    if (!id) return err('请提供诗歌 ID', 400);
    await db.prepare('DELETE FROM poems WHERE id=?').bind(id).run();
    return json({ ok: true });
  }

  return err('不支持的方法', 405);
}

// ============================================
// 鉴权路由 - 文件上传 upload
// ============================================
async function handleUpload(context) {
  const { request, env, user } = context;
  const db = env.DB;

  if (request.method !== 'POST') return err('不支持的方法', 405);

  const formData = await request.formData();
  const file = formData.get('file');
  const studentNo = formData.get('studentNo');
  if (!file) return err('请提供文件', 400);

  // 文件大小限制 2MB
  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) return err('文件大小不能超过 2MB', 400);

  // 获取 GitHub Token
  const token = await getSecret(db, 'github_token');
  if (!token) return err('未配置 GitHub Token', 500);

  // 判断文件类型
  const name = file.name || 'unnamed';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
  const isImage = imageExts.includes(ext);
  const dir = isImage ? 'images' : 'docs';

  // 读取文件内容并转 Base64
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  const content = btoa(binary);

  // 构建文件路径（避免冲突加时间戳）
  const timestamp = Date.now();
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `uploads/${dir}/${studentNo ? studentNo + '-' : ''}${timestamp}-${safeName}`;

  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;

  // 调用 GitHub Contents API
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
  const ghRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `upload ${name}`,
      content,
      branch,
    }),
  });

  if (!ghRes.ok) {
    const ghErr = await ghRes.text();
    return err('GitHub 上传失败: ' + ghErr, 502);
  }

  const ghData = await ghRes.json();
  const fileUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${path}`;

  return json({ url: fileUrl, path, sha: ghData.content && ghData.content.sha });
}

// ============================================
// 鉴权路由 - AI 聊天 ai/chat
// ============================================
async function handleAI(context) {
  const { request, env, user } = context;
  const db = env.DB;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const segments = path.split('/').filter(Boolean);
  const sub = segments[1] || '';

  if (sub !== 'chat') return err('AI 接口不存在: ' + sub, 404);
  if (request.method !== 'POST') return err('不支持的方法', 405);

  const body = await parseBody(request);
  if (!body.messages || !Array.isArray(body.messages)) return err('请提供 messages 数组', 400);

  // 获取 OpenRouter API key
  const apiKey = await getSecret(db, 'openrouter_key');
  if (!apiKey) return err('未配置 OpenRouter API Key', 500);

  const systemPrompt = '你是尚志中学2024届09班的AI学习助手。你可以帮助学生解答学习问题、辅助诗歌创作、提供写作建议。请用中文回答，保持友好和鼓励的语气。';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...body.messages,
  ];

  const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://szzx202409.pages.dev',
      'X-Title': '尚志中学09班官网',
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL || 'openrouter/free',
      messages,
    }),
  });

  if (!aiRes.ok) {
    const aiErr = await aiRes.text();
    return err('AI 请求失败: ' + aiErr, 502);
  }

  const aiData = await aiRes.json();
  const reply = aiData.choices && aiData.choices[0] && aiData.choices[0].message
    ? aiData.choices[0].message.content
    : '';

  return json({ reply });
}

// ============================================
// 鉴权路由 - 密钥管理 secrets
// ============================================
async function handleSecrets(context) {
  const { request, env, user } = context;
  const db = env.DB;

  // 仅管理员
  if (user.role !== 'admin') return err('无权限，仅管理员可操作', 403);

  // POST - 保存密钥
  if (request.method === 'POST') {
    const body = await parseBody(request);
    if (body.openrouterKey !== undefined && body.openrouterKey) {
      await saveSecret(db, 'openrouter_key', body.openrouterKey);
    }
    if (body.githubToken !== undefined && body.githubToken) {
      await saveSecret(db, 'github_token', body.githubToken);
    }
    return json({ ok: true });
  }

  // GET - 检查密钥配置状态
  if (request.method === 'GET') {
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

// ============================================
// 主路由处理
// ============================================
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const method = request.method;
  const segments = path.split('/').filter(Boolean);
  const route = segments[0] || '';

  // 公开路由
  if (route === 'login' && method === 'POST') return handleLogin(context);
  if (route === 'setup' && method === 'POST') return handleSetup(context);
  if (route === 'data' && method === 'GET') return handleData(context);
  if (route === 'ai') return handleAI(context); // AI 聊天公开访问，前端做次数限制

  // 鉴权
  const auth = request.headers.get('Authorization');
  let user = null;
  if (auth && auth.startsWith('Bearer ')) {
    user = await verifyJWT(auth.slice(7), env.JWT_SECRET);
  }
  if (!user) return err('请先登录', 401);
  context.user = user;

  // 鉴权路由
  if (route === 'contents') return handleContents(context);
  if (route === 'students') return handleStudents(context);
  if (route === 'poems') return handlePoems(context);
  if (route === 'upload') return handleUpload(context);
  if (route === 'ai') return handleAI(context);
  if (route === 'secrets') return handleSecrets(context);

  return err('接口不存在: ' + route, 404);
}
