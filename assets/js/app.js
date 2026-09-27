/* =====================================================================
   尚志中学 2024 届 09 班班级官网 — 前端共享脚本 v3 (GitHub Pages 静态版)
   数据：data/*.json (fetch 读取)
   写操作：GitHub Contents API (管理员配置 Token，存 sessionStorage)
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------- 配置 ---------- */
  var CONFIG = {
    repo: "XSVICYYDS/szzx202409",
    branch: "main",
    basePath: "",   // GitHub Pages 子路径，如 /szzx202409，运行时自动检测
    className: "尚志中学 2024 届 09 班",
    totalStudents: 48,
    slogan: "四十八位少年，以作品为记"
  };

  // 自动检测 basePath (GitHub Pages 子目录部署)
  (function detectBasePath() {
    var p = location.pathname;
    var m = p.match(/^(\/[^/]+)/);
    if (m && m[1] !== "/" && p !== "/index.html" && p !== "/") {
      // 如果路径不是根，取第一级作为 basePath
    }
    // 统一从 config.json 读取
  })();

  /* ---------- 课程表数据（严格对照 Excel）---------- */
  var SCHEDULE = {
    title: "尚志中学909班课程表（完整版·夏令时）",
    days: ["星期一", "星期二", "星期三", "星期四", "星期五"],
    rows: [
      { period: "早读",     time: "7:30-7:50",   subs: ["英语","语文","英语","语文","英语"] },
      { period: "第一节",   time: "8:00-8:40",   subs: ["语文","历史","科学","语文","英语"] },
      { period: "第二节",   time: "9:10-9:50",   subs: ["数学","英语","数学","科学","科学"] },
      { period: "第三节",   time: "10:05-10:45", subs: ["科学","数学","英语","道德与法治","语文"] },
      { period: "第四节",   time: "11:00-11:40", subs: ["英语","语文","美术","数学","体育与健康"] },
      { period: "午间小课", time: "12:20-12:40", subs: ["数学","科学","英语","道德与法治","数学"] },
      { period: "第五节",   time: "13:15-13:55", subs: ["道德与法治","英语","语文","音乐","数学"] },
      { period: "第六节",   time: "14:10-14:50", subs: ["体育与健康","科学","地理","语文","历史"] },
      { period: "第七节",   time: "15:05-15:45", subs: ["科学","体育与健康","数学","语文","班队（心理）"] },
      { period: "作业整理", time: "15:50-16:30", subs: ["英语","数学","科学","科学","语文"] },
      { period: "晚自习",   time: "18:00-20:10", subs: ["体育与健康","道德与法治","音乐","数学","英语"] }
    ],
    saturday: "周六上午：8:00-8:40 第一节 · 8:50-9:30 第二节 · 9:40-10:20 第三节 · 10:30-11:10 第四节",
    note: "课程表仅供参考，以实际课程为准。"
  };

  var SUBJECT_COLORS = {
    "语文": { bg: "#fdf1e8", fg: "#b15a00" },
    "数学": { bg: "#eef2fa", fg: "#1f3a5f" },
    "英语": { bg: "#e9f6ee", fg: "#2f7d52" },
    "科学": { bg: "#f3edfb", fg: "#6a3da6" },
    "历史": { bg: "#fbe6e1", fg: "#a0421f" },
    "地理": { bg: "#e4f3ef", fg: "#1f6f5a" },
    "道德与法治": { bg: "#fbeef4", fg: "#9b2a5c" },
    "体育与健康": { bg: "#e8f5fb", fg: "#1c6b93" },
    "音乐": { bg: "#f5ecff", fg: "#7a44b8" },
    "美术": { bg: "#fff0f5", fg: "#b23a6b" },
    "劳动": { bg: "#f0f7e8", fg: "#4a7a2a" },
    "班队（心理）": { bg: "#fbeceb", fg: "#9a3a3a" }
  };
  function getSubjectColor(subject) {
    return SUBJECT_COLORS[subject] || { bg: "#f1ece0", fg: "#5b6675" };
  }

  /* ---------- basePath 处理 ---------- */
  function bp(path) {
    return (CONFIG.basePath || "") + path;
  }

  /* ---------- 内存缓存 ---------- */
  var cache = {
    students: [],
    poems: [],
    contents: [],
    users: [],
    config: {},
    session: null,
    loaded: false
  };

  /* ---------- 加载全部数据 ---------- */
  function loadAll() {
    // 使用相对路径，兼容 GitHub Pages 子目录部署（如 /szzx202409/）
    return fetch("data/config.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (cfg) {
        cache.config = cfg || {};
        if (cfg.basePath) CONFIG.basePath = cfg.basePath;
        if (cfg.className) CONFIG.className = cfg.className;
        if (cfg.totalStudents) CONFIG.totalStudents = cfg.totalStudents;
        if (cfg.slogan) CONFIG.slogan = cfg.slogan;
        return Promise.all([
          fetch("data/students.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
          fetch("data/poems.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
          fetch("data/contents.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
          fetch("data/users.json").then(function (r) { return r.json(); }).catch(function () { return []; })
        ]);
      }).then(function (results) {
        cache.students = results[0] || [];
        cache.poems = results[1] || [];
        cache.contents = results[2] || [];
        cache.users = results[3] || [];
        cache.session = getSession();
        cache.loaded = true;
        return cache;
      });
  }

  /* ---------- 会话管理 (sessionStorage) ---------- */
  var SESSION_KEY = "szzx_session";
  var TOKEN_KEY = "szzx_gh_token";
  var LOCK_KEY = "szzx_lock";

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (e) { return null; }
  }
  function setSession(s) {
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
    cache.session = s;
  }
  function getToken() { return sessionStorage.getItem(TOKEN_KEY) || ""; }
  function setToken(t) {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  /* ---------- 锁定机制（管理员密码错误超限）---------- */
  function getLockInfo() {
    try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "null"); }
    catch (e) { return null; }
  }
  function isLocked() {
    var info = getLockInfo();
    if (!info) return false;
    if (info.lockedUntil && new Date(info.lockedUntil) > new Date()) return true;
    if (info.lockedUntil) { localStorage.removeItem(LOCK_KEY); return false; }
    return false;
  }
  function recordFail() {
    var info = getLockInfo() || { failCount: 0, lockedUntil: null };
    info.failCount = (info.failCount || 0) + 1;
    if (info.failCount >= 5) {
      info.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    }
    localStorage.setItem(LOCK_KEY, JSON.stringify(info));
  }
  function clearLock() { localStorage.removeItem(LOCK_KEY); }

  /* ---------- 密码哈希（浏览器端同步，不依赖 Web Crypto）---------- */
  function hashPassword(pwd) {
    var salt = "szzx202409-salt";
    return Promise.resolve(simpleHash(salt + pwd));
  }
  function simpleHash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0") +
           (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  }

  /* ---------- 认证 ---------- */
  function loginStudent(studentNo) {
    var s = cache.students.find(function (x) { return x.studentNo === studentNo; });
    if (!s) return Promise.resolve({ ok: false, msg: "学号不存在，请检查后重试" });
    setSession({ role: "student", studentNo: s.studentNo, name: s.name });
    return Promise.resolve({ ok: true, student: { studentNo: s.studentNo, name: s.name, bio: s.bio } });
  }

  function loginAdmin(username, password) {
    if (isLocked()) {
      var info = getLockInfo();
      var left = Math.ceil((new Date(info.lockedUntil) - new Date()) / 60000);
      return Promise.resolve({ ok: false, msg: "密码错误次数过多，已锁定 " + left + " 分钟，请稍后再试" });
    }
    var u = cache.users.find(function (x) { return x.username === username });
    if (!u) { recordFail(); return Promise.resolve({ ok: false, msg: "管理员账号不存在" }); }
    return hashPassword(password).then(function (hash) {
      // 兼容：存储的可能是 bcrypt hash 或 SHA-256 hash
      // 这里对比 SHA-256 hash；如果是 bcrypt hash 则提示用户重新设置
      if (u.passwordHash === hash) {
        clearLock();
        setSession({ role: "admin", username: u.username });
        return { ok: true };
      }
      recordFail();
      return { ok: false, msg: "管理员账号或密码错误" };
    });
  }

  function logout() {
    setSession(null);
    return Promise.resolve({ ok: true });
  }
  function setAdminSession() {
    setSession({ role: "admin", username: "github" });
  }
  function getSessionUser() { return cache.session; }
  function isAdmin() { return cache.session && cache.session.role === "admin"; }
  function isStudent() { return cache.session && cache.session.role === "student"; }
  function currentStudentNo() { return cache.session && cache.session.role === "student" ? cache.session.studentNo : null; }

  /* ---------- 学生数据 ---------- */
  function getAllStudents() { return cache.students; }
  function getStudent(no) {
    return cache.students.find(function (s) { return s.studentNo === no; }) || null;
  }

  /* ---------- 诗歌数据 ---------- */
  function getPoems() { return cache.poems; }
  function getPoemsByStudent(no) {
    return cache.poems.filter(function (p) { return p.studentNo === no; });
  }

  /* ---------- 内容数据 ---------- */
  function getContents() { return cache.contents.filter(function (c) { return c.status === "approved"; }); }
  function getAllContents() { return cache.contents; }
  function getContentsByStudent(no) {
    return cache.contents.filter(function (c) { return c.studentNo === no; });
  }
  function getPendingContents() {
    return cache.contents.filter(function (c) { return c.status === "pending"; });
  }
  function getRecentContents(n) {
    return getContents().slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, n || 6);
  }

  /* ---------- GitHub Contents API（写操作）---------- */
  var GH_API = "https://api.github.com";

  function getFile(path) {
    var url = GH_API + "/repos/" + CONFIG.repo + "/contents/" + path + "?ref=" + CONFIG.branch;
    return fetch(url, { headers: { "Authorization": "token " + getToken(), "Accept": "application/vnd.github+json" } })
      .then(function (r) {
        if (r.status === 404) return null; // 文件不存在
        if (!r.ok) {
          return r.json().then(function (j) {
            throw new Error("获取文件失败 (" + r.status + "): " + (j.message || r.statusText));
          }, function () {
            throw new Error("获取文件失败 (" + r.status + ")");
          });
        }
        return r.json();
      });
  }

  function putFile(path, content, message) {
    return getFile(path).then(function (file) {
      var sha = (file && file.sha) || null;
      return _put(path, content, message, sha);
    });
  }

  function _put(path, content, message, sha) {
    var url = GH_API + "/repos/" + CONFIG.repo + "/contents/" + path;
    var body = {
      message: message || "update " + path,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: CONFIG.branch
    };
    if (sha) body.sha = sha;
    return fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": "token " + getToken(),
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || "GitHub API 错误"); });
      return r.json();
    });
  }

  function saveContents() {
    return putFile("data/contents.json", JSON.stringify(cache.contents, null, 2), "更新作品数据");
  }
  function saveStudents() {
    return putFile("data/students.json", JSON.stringify(cache.students, null, 2), "更新学生数据");
  }
  function savePoems() {
    return putFile("data/poems.json", JSON.stringify(cache.poems, null, 2), "更新诗歌数据");
  }

  /* ---------- GitHub OAuth Device Flow（静态站点无需后端回调）---------- */
  function getOAuthClientId() {
    return (cache.config && cache.config.oauthClientId) || CONFIG.oauthClientId || "";
  }

  function startDeviceFlow() {
    var clientId = getOAuthClientId();
    if (!clientId) {
      return Promise.reject(new Error("未配置 OAuth Client ID，请先在 config.json 中设置 oauthClientId"));
    }
    return fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ client_id: clientId, scope: "repo" })
    }).then(function (r) {
      if (!r.ok) throw new Error("启动设备流程失败 (" + r.status + ")");
      return r.json();
    });
  }

  function pollForToken(deviceCode, interval, expiresIn) {
    var clientId = getOAuthClientId();
    var startTime = Date.now();
    var timeoutMs = (expiresIn || 900) * 1000;

    return new Promise(function (resolve, reject) {
      function poll() {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error("登录超时，请重试"));
          return;
        }
        fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            device_code: deviceCode,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code"
          })
        }).then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.access_token) {
              resolve(data.access_token);
            } else if (data.error === "authorization_pending") {
              setTimeout(poll, (interval || 5) * 1000);
            } else if (data.error === "slow_down") {
              setTimeout(poll, (interval ? interval + 5 : 10) * 1000);
            } else if (data.error === "expired_token") {
              reject(new Error("验证码已过期，请重试"));
            } else if (data.error === "access_denied") {
              reject(new Error("用户拒绝了授权"));
            } else {
              reject(new Error(data.error_description || data.error || "授权失败"));
            }
          }).catch(function (e) { reject(e); });
      }
      poll();
    });
  }

  /* ---------- 内容上传（GitHub 提交）---------- */
  function uploadContent(data) {
    if (!isAdmin() && !isStudent()) return Promise.resolve({ ok: false, msg: "请先登录" });
    var token = getToken();
    if (!token && !isAdmin()) {
      // 学生上传需要管理员已配置 token；若没有，提示
      return Promise.resolve({ ok: false, msg: "管理员尚未配置 GitHub Token，暂时无法上传作品" });
    }

    var user = cache.session;
    var studentNo, authorName;
    if (user.role === "student") {
      studentNo = user.studentNo;
      var stu = getStudent(studentNo);
      authorName = stu ? stu.name : "未知";
    } else {
      studentNo = data.studentNo || "admin";
      var s2 = studentNo !== "admin" ? getStudent(studentNo) : null;
      authorName = s2 ? s2.name : "管理员";
    }
    var status = user.role === "admin" ? "approved" : "pending";

    var item = {
      id: Date.now(),
      type: data.type,
      title: data.title,
      content: data.content || null,
      filePath: null,
      originalFilename: data.originalFilename || null,
      mimeType: data.mimeType || null,
      fileSize: data.fileSize || null,
      studentNo: studentNo,
      authorName: authorName,
      uploadedBy: user.role,
      status: status,
      rejectReason: null,
      createdAt: new Date().toISOString(),
      approvedAt: status === "approved" ? new Date().toISOString() : null,
      approvedBy: status === "approved" ? (user.username || "admin") : null
    };

    function finish() {
      cache.contents.push(item);
      return saveContents().then(function () {
        return { ok: true, msg: status === "approved" ? "内容已直接发布" : "内容已提交，等待管理员审批", id: item.id, status: status };
      });
    }

    if (data.type === "text") {
      if (!data.content) return Promise.resolve({ ok: false, msg: "文字内容不能为空" });
      return finish();
    }

    // 图片 / Word：先提交文件到 uploads/
    if (!data.fileContent) return Promise.resolve({ ok: false, msg: "请选择文件" });
    var subDir = data.type === "image" ? "images" : "docs";
    var ext = (data.originalFilename || "").split(".").pop() || "bin";
    var fileName = Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
    var filePath = "uploads/" + subDir + "/" + fileName;

    var url = GH_API + "/repos/" + CONFIG.repo + "/contents/" + filePath;
    var body = {
      message: "上传作品: " + data.title,
      content: data.fileContent, // base64
      branch: CONFIG.branch
    };
    return fetch(url, {
      method: "PUT",
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error("文件上传失败");
      item.filePath = filePath;
      item.originalFilename = data.originalFilename;
      item.mimeType = data.mimeType;
      item.fileSize = data.fileSize;
      return finish();
    });
  }

  /* ---------- 审批 ---------- */
  function approveContent(id) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var c = cache.contents.find(function (x) { return String(x.id) === String(id); });
    if (!c) return Promise.resolve({ ok: false, msg: "内容不存在" });
    c.status = "approved";
    c.approvedAt = new Date().toISOString();
    c.approvedBy = cache.session.username;
    c.rejectReason = null;
    return saveContents().then(function () { return { ok: true, msg: "内容已审批通过" }; });
  }
  function rejectContent(id, reason) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var c = cache.contents.find(function (x) { return String(x.id) === String(id); });
    if (!c) return Promise.resolve({ ok: false, msg: "内容不存在" });
    c.status = "rejected";
    c.rejectReason = reason || "未通过审批";
    c.approvedAt = new Date().toISOString();
    c.approvedBy = cache.session.username;
    return saveContents().then(function () { return { ok: true, msg: "内容已拒绝" }; });
  }
  function deleteContent(id) {
    var idx = cache.contents.findIndex(function (c) { return String(c.id) === String(id); });
    if (idx === -1) return Promise.resolve({ ok: false, msg: "内容不存在" });
    var c = cache.contents[idx];
    var isAdm = isAdmin();
    var isOwner = isStudent() && currentStudentNo() === c.studentNo;
    if (!isAdm && !isOwner) return Promise.resolve({ ok: false, msg: "无权删除" });
    cache.contents.splice(idx, 1);
    return saveContents().then(function () { return { ok: true, msg: "内容已删除" }; });
  }

  /* ---------- 学生管理 ---------- */
  function updateStudent(no, patch) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var s = getStudent(no);
    if (!s) return Promise.resolve({ ok: false, msg: "学生不存在" });
    if (patch.studentNo && patch.studentNo !== no) {
      if (getStudent(patch.studentNo)) return Promise.resolve({ ok: false, msg: "学号已被使用" });
      var oldNo = s.studentNo;
      cache.contents.forEach(function (c) { if (c.studentNo === oldNo) c.studentNo = patch.studentNo; });
      cache.poems.forEach(function (p) { if (p.studentNo === oldNo) p.studentNo = patch.studentNo; });
      s.studentNo = patch.studentNo;
    }
    if (patch.name) s.name = patch.name;
    if (patch.bio !== undefined) s.bio = patch.bio;
    return saveStudents().then(function () {
      return saveContents();
    }).then(function () {
      return savePoems();
    }).then(function () { return { ok: true, msg: "学生信息已更新" }; });
  }
  function addStudent(data) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    if (!data.studentNo || !data.name) return Promise.resolve({ ok: false, msg: "学号和姓名不能为空" });
    if (getStudent(data.studentNo)) return Promise.resolve({ ok: false, msg: "学号已存在" });
    cache.students.push({
      studentNo: data.studentNo, name: data.name,
      username: "szzx" + data.studentNo.slice(-4),
      bio: data.bio || data.name + " 同学，尚志中学 2024 届 09 班。",
      createdAt: new Date().toISOString()
    });
    return saveStudents().then(function () { return { ok: true, msg: "学生已添加" }; });
  }
  function deleteStudent(no) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var idx = cache.students.findIndex(function (s) { return s.studentNo === no; });
    if (idx === -1) return Promise.resolve({ ok: false, msg: "学生不存在" });
    cache.students.splice(idx, 1);
    return saveStudents().then(function () { return { ok: true, msg: "学生已删除" }; });
  }

  /* ---------- 诗歌管理 ---------- */
  function addPoem(data) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var stu = getStudent(data.studentNo);
    cache.poems.push({
      id: "p" + Date.now(), studentNo: data.studentNo,
      title: data.title || "未命名", content: data.content || "",
      author: stu ? stu.name : "未知", status: data.status || "published",
      createdAt: new Date().toISOString()
    });
    return savePoems().then(function () { return { ok: true, msg: "诗歌已添加" }; });
  }
  function updatePoem(id, patch) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var p = cache.poems.find(function (x) { return String(x.id) === String(id); });
    if (!p) return Promise.resolve({ ok: false, msg: "诗歌不存在" });
    if (patch.studentNo) { p.studentNo = patch.studentNo; var s = getStudent(patch.studentNo); if (s) p.author = s.name; }
    if (patch.title) p.title = patch.title;
    if (patch.content) p.content = patch.content;
    if (patch.status) p.status = patch.status;
    return savePoems().then(function () { return { ok: true, msg: "诗歌已更新" }; });
  }
  function deletePoem(id) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var idx = cache.poems.findIndex(function (p) { return String(p.id) === String(id); });
    if (idx === -1) return Promise.resolve({ ok: false, msg: "诗歌不存在" });
    cache.poems.splice(idx, 1);
    return savePoems().then(function () { return { ok: true, msg: "诗歌已删除" }; });
  }

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(iso) {
    try { var d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    catch (e) { return ""; }
  }
  function fmtSize(bytes) {
    if (!bytes) return "—";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }
  function statusLabel(s) {
    return s === "approved" ? "已发布" : s === "pending" ? "待审批" : s === "rejected" ? "已拒绝" : s;
  }
  function statusClass(s) {
    return s === "approved" ? "published" : s === "pending" ? "draft" : "rejected";
  }
  function contentCount(studentNo) {
    return cache.contents.filter(function (c) { return c.studentNo === studentNo && c.status === "approved"; }).length;
  }
  function poemCount(studentNo) {
    return cache.poems.filter(function (p) { return p.studentNo === studentNo; }).length;
  }

  /* ---------- Toast 通知 ---------- */
  function toast(msg, type) {
    var el = document.createElement("div");
    el.className = "toast " + (type || "info");
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2800);
  }

  /* ---------- 导航与页脚 ---------- */
  function renderNav(active) {
    var s = cache.session;
    var who = "";
    if (s && s.role === "student") who = '<span class="who">' + escapeHtml(s.name || s.studentNo) + '</span>';
    if (s && s.role === "admin") who = '<span class="who">管理员</span>';

    var links = [
      { href: "index.html", t: "首页", a: "home" },
      { href: "students.html", t: "同学名录", a: "students" },
      { href: "gallery.html", t: "班级作品", a: "gallery" },
      { href: "schedule.html", t: "课程表", a: "schedule" },
      { href: "login.html", t: "学生登录", a: "login" },
      { href: "admin.html", t: "管理后台", a: "admin" }
    ];
    return '<header class="site-nav"><div class="wrap nav-inner">' +
      '<a class="brand" href="index.html"><span class="brand-mark">09</span><span class="brand-text">' + CONFIG.className + '</span></a>' +
      '<nav class="links">' +
      links.map(function (l) {
        return '<a href="' + l.href + '" class="' + (l.a === active ? "active" : "") + '">' + l.t + '</a>';
      }).join("") + '</nav>' +
      '<div class="nav-right">' + who +
      (s ? '<a class="btn-ghost" href="#" id="navLogout">退出</a>' : '') +
      '</div></div></header>';
  }
  function mountNav(active) {
    var el = document.getElementById("nav");
    if (el) el.innerHTML = renderNav(active);
    var lo = document.getElementById("navLogout");
    if (lo) lo.addEventListener("click", function (e) {
      e.preventDefault(); logout().then(function () { location.href = "index.html"; });
    });
  }
  function renderFooter() {
    return '<footer class="site-foot"><div class="wrap"><p>' + CONFIG.className + ' · 班级官方网站</p>' +
      '<p class="muted">' + CONFIG.slogan + ' · ' + new Date().getFullYear() + '</p></div></footer>';
  }
  function mountFooter() {
    var el = document.getElementById("footer");
    if (el) el.innerHTML = renderFooter();
  }

  /* ---------- 启动加载动画 ---------- */
  function showSplash() {
    var splash = document.getElementById("splash");
    if (!splash) return;
    var start = Date.now();
    function hide() {
      var elapsed = Date.now() - start;
      var delay = Math.max(0, 600 - elapsed);
      setTimeout(function () {
        splash.style.opacity = "0";
        setTimeout(function () { splash.style.display = "none"; }, 400);
      }, delay);
    }
    if (document.readyState === "complete") hide();
    else window.addEventListener("load", hide);
    setTimeout(hide, 3000); // 兜底
  }

  /* ---------- 导出 ---------- */
  global.SZX = {
    CONFIG: CONFIG,
    SCHEDULE: SCHEDULE, getSubjectColor: getSubjectColor,
    loadAll: loadAll,
    bp: bp,
    getAllStudents: getAllStudents, getStudent: getStudent,
    getPoems: getPoems, getPoemsByStudent: getPoemsByStudent,
    getContents: getContents, getAllContents: getAllContents,
    getContentsByStudent: getContentsByStudent, getPendingContents: getPendingContents,
    getRecentContents: getRecentContents,
    loginStudent: loginStudent, loginAdmin: loginAdmin, logout: logout, setAdminSession: setAdminSession,
    getSession: getSessionUser, isStudent: isStudent, isAdmin: isAdmin, currentStudentNo: currentStudentNo,
    getToken: getToken, setToken: setToken, isLocked: isLocked,
    getOAuthClientId: getOAuthClientId, startDeviceFlow: startDeviceFlow, pollForToken: pollForToken,
    putFile: putFile,
    updateStudent: updateStudent, addStudent: addStudent, deleteStudent: deleteStudent,
    addPoem: addPoem, updatePoem: updatePoem, deletePoem: deletePoem,
    uploadContent: uploadContent,
    approveContent: approveContent, rejectContent: rejectContent, deleteContent: deleteContent,
    contentCount: contentCount, poemCount: poemCount,
    escapeHtml: escapeHtml, fmtDate: fmtDate, fmtSize: fmtSize,
    statusLabel: statusLabel, statusClass: statusClass,
    toast: toast,
    mountNav: mountNav, mountFooter: mountFooter, showSplash: showSplash
  };
})(window);
