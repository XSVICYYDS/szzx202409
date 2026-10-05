/* =====================================================================
   尚志中学 2024 届 09 班班级官网 — 前端共享脚本 v4 (Cloudflare Pages + D1)
   数据：GET /api/data (D1 数据库)
   写操作：POST/PUT/DELETE /api/* (JWT 鉴权)
   AI 聊天：POST /api/chat (OpenRouter，公开访问)
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------- 配置 ---------- */
  var CONFIG = {
    className: "尚志中学 2024 届 09 班",
    totalStudents: 48,
    slogan: "四十八位少年，以作品为记",
    apiBase: "/api"
  };

  /* ---------- 课程表数据（fallback，API 返回时覆盖）---------- */
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
  function bp(path) { return path; }

  /* ---------- 内存缓存 ---------- */
  var cache = {
    students: [], poems: [], contents: [], users: [], config: {},
    session: null, loaded: false, apiOnline: null
  };

  /* ---------- 会话管理 (sessionStorage) ---------- */
  var SESSION_KEY = "szzx_session";
  var TOKEN_KEY = "szzx_token";

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

  /* ---------- 静态托管模式提示 ---------- */
  var STATIC_MSG = "当前为静态托管模式（GitHub Pages），此操作需要后端支持。请部署 Cloudflare Functions 后使用。";

  /* ---------- API 调用 ---------- */
  function api(path, options) {
    options = options || {};
    // 静态托管模式下，非读操作直接拒绝
    var method = (options.method || "GET").toUpperCase();
    if (cache.apiOnline === false && method !== "GET") {
      return Promise.reject(new Error(STATIC_MSG));
    }
    var token = getToken();
    var headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    if (options.headers) for (var k in options.headers) headers[k] = options.headers[k];
    var opts = { method: method, headers: headers };
    if (options.body) opts.body = options.body;
    return fetch(CONFIG.apiBase + "/" + path, opts).then(function (r) {
      return r.text().then(function (text) {
        var data;
        var parseOk = true;
        try { data = text ? JSON.parse(text) : {}; }
        catch (e) { parseOk = false; data = null; }
        if (!parseOk) {
          cache.apiOnline = false;
          throw new Error(STATIC_MSG);
        }
        cache.apiOnline = true;
        if (!r.ok) throw new Error(data.error || "API错误 (" + r.status + ")");
        return data;
      });
    });
  }

  function apiUpload(path, formData) {
    if (cache.apiOnline === false) {
      return Promise.reject(new Error(STATIC_MSG));
    }
    var token = getToken();
    var headers = {};
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(CONFIG.apiBase + "/" + path, {
      method: "POST", headers: headers, body: formData
    }).then(function (r) {
      return r.json().then(function (data) {
        cache.apiOnline = true;
        if (!r.ok) throw new Error(data.error || "上传失败 (" + r.status + ")");
        return data;
      });
    }).catch(function (e) {
      if (e.message === STATIC_MSG) throw e;
      cache.apiOnline = false;
      throw new Error(STATIC_MSG);
    });
  }

  /* ---------- 数据转换（D1 snake_case → 前端 camelCase）---------- */
  function tfStudent(s) {
    return {
      id: s.id, studentNo: s.student_no, name: s.name,
      bio: s.bio || (s.name + " 同学，尚志中学 2024 届 09 班。"),
      enrollmentYear: s.enrollment_year, avatar: s.avatar,
      createdAt: s.created_at
    };
  }
  function tfContent(c) {
    return {
      id: c.id, studentNo: c.student_no, type: c.type,
      title: c.title || "", content: c.description || "",
      description: c.description || "", fileUrl: c.file_url,
      filePath: c.file_url, status: c.status,
      reviewedBy: c.reviewed_by, reviewedAt: c.reviewed_at,
      createdAt: c.created_at,
      authorName: c.student_no
    };
  }
  function tfPoem(p) {
    return {
      id: p.id, studentNo: p.student_no, title: p.title,
      content: p.content, author: p.author, status: p.status,
      createdAt: p.created_at
    };
  }

  /* ---------- 加载全部数据 ---------- */
  function loadAll() {
    return api("data").then(function (data) {
      cache.config = data.config || {};
      cache.students = (data.students || []).map(tfStudent);
      cache.poems = (data.poems || []).map(tfPoem);
      cache.contents = (data.contents || []).map(tfContent);
      if (data.schedule) SCHEDULE = data.schedule;
      if (cache.config.className) CONFIG.className = cache.config.className;
      if (cache.config.totalStudents) CONFIG.totalStudents = parseInt(cache.config.totalStudents);
      if (cache.config.slogan) CONFIG.slogan = cache.config.slogan;
      cache.session = getSession();
      cache.loaded = true;
      return cache;
    }).catch(function () {
      // API 不可用时 fallback 到 JSON 文件
      return loadFromJSON();
    });
  }

  function loadFromJSON() {
    return fetch("data/config.json").then(function (r) { return r.json(); }).catch(function () { return {}; })
      .then(function (cfg) {
        cache.config = cfg || {};
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

  /* ---------- 加载全部内容（含待审批，管理后台用）---------- */
  function loadAllContents() {
    return api("contents").then(function (data) {
      cache.contents = (data || []).map(tfContent);
      return cache.contents;
    }).catch(function () { return cache.contents; });
  }
  function loadAllPoems() {
    return api("poems").then(function (data) {
      cache.poems = (data || []).map(tfPoem);
      return cache.poems;
    }).catch(function () { return cache.poems; });
  }

  /* ---------- 简易密码哈希（fallback 用，后端用 SHA-256）---------- */
  function simpleHash(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  /* ---------- 认证 ---------- */
  function loginStudent(studentNo) {
    if (!studentNo || !/^\d{9}$/.test(studentNo)) {
      return Promise.resolve({ ok: false, msg: "学号格式错误，请输入 9 位数字学号" });
    }
    return api("login", {
      method: "POST",
      body: JSON.stringify({ studentNo: studentNo })
    }).then(function (data) {
      setToken(data.token);
      setSession({ role: "student", studentNo: data.studentNo, name: data.name });
      return { ok: true, student: { studentNo: data.studentNo, name: data.name } };
    }).catch(function () {
      // API 不可用（如 GitHub Pages），fallback 到本地 JSON 数据
      if (!cache.loaded) {
        return loadAll().then(function () { return loginStudentFallback(studentNo); });
      }
      return loginStudentFallback(studentNo);
    });
  }

  function loginStudentFallback(studentNo) {
    var s = cache.students.find(function (x) { return x.studentNo === studentNo; });
    if (!s) return { ok: false, msg: "学号不存在，请检查后重试" };
    setToken("local-fallback-student-" + s.studentNo);
    setSession({ role: "student", studentNo: s.studentNo, name: s.name });
    return { ok: true, student: { studentNo: s.studentNo, name: s.name } };
  }

  function loginAdmin(username, password) {
    if (!username || !password) {
      return Promise.resolve({ ok: false, msg: "请输入账号和密码" });
    }
    return api("login", {
      method: "POST",
      body: JSON.stringify({ username: username, password: password })
    }).then(function (data) {
      setToken(data.token);
      setSession({ role: "admin", username: data.name });
      return { ok: true };
    }).catch(function () {
      // API 不可用，fallback 到本地 JSON 数据
      if (!cache.loaded) {
        return loadAll().then(function () { return loginAdminFallback(username, password); });
      }
      return loginAdminFallback(username, password);
    });
  }

  function loginAdminFallback(username, password) {
    var users = cache.users || [];
    var u = users.find(function (x) { return x.username === username; });
    var salt = "szzx202409-salt";
    if (u && u.passwordHash) {
      if (u.passwordHash.length === 8 && u.passwordHash === simpleHash(salt + password)) {
        setToken("local-fallback-admin-" + u.username);
        setSession({ role: "admin", username: u.username });
        return { ok: true };
      }
      if (u.passwordHash === password) {
        setToken("local-fallback-admin-" + u.username);
        setSession({ role: "admin", username: u.username });
        return { ok: true };
      }
    }
    // 默认账号兜底
    if (username === "szzx202409" && password === "szzx202409") {
      setToken("local-fallback-admin-szzx202409");
      setSession({ role: "admin", username: "szzx202409" });
      return { ok: true };
    }
    if (!u) return { ok: false, msg: "管理员账号不存在" };
    return { ok: false, msg: "管理员账号或密码错误" };
  }

  function logout() {
    setSession(null);
    setToken(null);
    return Promise.resolve({ ok: true });
  }
  function setAdminSession() {
    setSession({ role: "admin", username: "github" });
  }
  function getSessionUser() { return cache.session; }
  function isAdmin() { return cache.session && cache.session.role === "admin"; }
  function isStudent() { return cache.session && cache.session.role === "student"; }
  function currentStudentNo() { return cache.session && cache.session.role === "student" ? cache.session.studentNo : null; }
  function isLocked() { return false; }

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

  /* ---------- 内容上传 ---------- */
  function uploadContent(data) {
    if (!isAdmin() && !isStudent()) return Promise.resolve({ ok: false, msg: "请先登录" });

    var user = cache.session;
    var studentNo = user.role === "student" ? user.studentNo : (data.studentNo || "admin");
    var status = user.role === "admin" ? "approved" : "pending";

    function createContentRecord(fileUrl) {
      return api("contents", {
        method: "POST",
        body: JSON.stringify({
          studentNo: studentNo,
          type: data.type,
          title: data.title || "",
          description: data.content || data.description || "",
          fileUrl: fileUrl || null
        })
      }).then(function (res) {
        // 刷新缓存
        return loadAllContents().then(function () {
          return { ok: true, msg: status === "approved" ? "内容已直接发布" : "内容已提交，等待管理员审批", id: res.id, status: status };
        });
      }).catch(function (e) {
        return { ok: false, msg: e.message || "提交失败" };
      });
    }

    if (data.type === "text") {
      if (!data.content) return Promise.resolve({ ok: false, msg: "文字内容不能为空" });
      return createContentRecord(null);
    }

    // 图片 / Word：通过 API 上传
    if (!data.fileContent) return Promise.resolve({ ok: false, msg: "请选择文件" });

    // data.fileContent 是 base64 字符串，需要转换为 Blob 再用 FormData
    var byteChars = atob(data.fileContent);
    var byteArray = new Uint8Array(byteChars.length);
    for (var i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
    var blob = new Blob([byteArray], { type: data.mimeType || "application/octet-stream" });
    var formData = new FormData();
    formData.append("file", blob, data.originalFilename || "upload.bin");
    formData.append("studentNo", studentNo);

    return apiUpload("upload", formData).then(function (res) {
      return createContentRecord(res.url);
    }).catch(function (e) {
      return { ok: false, msg: e.message || "文件上传失败" };
    });
  }

  /* ---------- 审批 ---------- */
  function approveContent(id) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    return api("contents", {
      method: "PUT",
      body: JSON.stringify({ id: String(id), status: "approved" })
    }).then(function () {
      var c = cache.contents.find(function (x) { return String(x.id) === String(id); });
      if (c) { c.status = "approved"; c.reviewedBy = cache.session.username; }
      return { ok: true, msg: "内容已审批通过" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function rejectContent(id, reason) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    return api("contents", {
      method: "PUT",
      body: JSON.stringify({ id: String(id), status: "rejected" })
    }).then(function () {
      var c = cache.contents.find(function (x) { return String(x.id) === String(id); });
      if (c) { c.status = "rejected"; c.reviewedBy = cache.session.username; }
      return { ok: true, msg: "内容已拒绝" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function deleteContent(id) {
    var c = cache.contents.find(function (x) { return String(x.id) === String(id); });
    if (!c) return Promise.resolve({ ok: false, msg: "内容不存在" });
    var isAdm = isAdmin();
    var isOwner = isStudent() && currentStudentNo() === c.studentNo;
    if (!isAdm && !isOwner) return Promise.resolve({ ok: false, msg: "无权删除" });
    return api("contents?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function () {
      var idx = cache.contents.findIndex(function (x) { return String(x.id) === String(id); });
      if (idx !== -1) cache.contents.splice(idx, 1);
      return { ok: true, msg: "内容已删除" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }

  /* ---------- 学生管理 ---------- */
  function updateStudent(no, patch) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var s = getStudent(no);
    if (!s) return Promise.resolve({ ok: false, msg: "学生不存在" });
    var body = { id: s.id };
    if (patch.studentNo) body.studentNo = patch.studentNo;
    if (patch.name) body.name = patch.name;
    if (patch.bio !== undefined) body.bio = patch.bio;
    return api("students", { method: "PUT", body: JSON.stringify(body) }).then(function () {
      if (patch.studentNo) { s.studentNo = patch.studentNo; }
      if (patch.name) s.name = patch.name;
      if (patch.bio !== undefined) s.bio = patch.bio;
      return { ok: true, msg: "学生信息已更新" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function addStudent(data) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    if (!data.studentNo || !data.name) return Promise.resolve({ ok: false, msg: "学号和姓名不能为空" });
    return api("students", {
      method: "POST",
      body: JSON.stringify({ studentNo: data.studentNo, name: data.name, bio: data.bio })
    }).then(function () {
      cache.students.push({
        studentNo: data.studentNo, name: data.name,
        bio: data.bio || data.name + " 同学，尚志中学 2024 届 09 班。",
        createdAt: new Date().toISOString()
      });
      return { ok: true, msg: "学生已添加" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function deleteStudent(no) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var s = getStudent(no);
    if (!s) return Promise.resolve({ ok: false, msg: "学生不存在" });
    return api("students?id=" + encodeURIComponent(s.id), { method: "DELETE" }).then(function () {
      var idx = cache.students.findIndex(function (x) { return x.studentNo === no; });
      if (idx !== -1) cache.students.splice(idx, 1);
      return { ok: true, msg: "学生已删除" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }

  /* ---------- 诗歌管理 ---------- */
  function addPoem(data) {
    if (!isAdmin() && !isStudent()) return Promise.resolve({ ok: false, msg: "请先登录" });
    return api("poems", {
      method: "POST",
      body: JSON.stringify({
        studentNo: data.studentNo || (isStudent() ? currentStudentNo() : null),
        title: data.title || "未命名",
        content: data.content || "",
        author: data.author || (cache.session ? cache.session.name : "未知"),
        status: data.status || (isAdmin() ? "approved" : "pending")
      })
    }).then(function (res) {
      cache.poems.push({
        id: res.id, studentNo: data.studentNo || currentStudentNo(),
        title: data.title || "未命名", content: data.content || "",
        author: data.author || (cache.session ? cache.session.name : "未知"),
        status: data.status || (isAdmin() ? "approved" : "pending"),
        createdAt: new Date().toISOString()
      });
      return { ok: true, msg: "诗歌已添加" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function updatePoem(id, patch) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    var p = cache.poems.find(function (x) { return String(x.id) === String(id); });
    if (!p) return Promise.resolve({ ok: false, msg: "诗歌不存在" });
    var body = { id: String(id) };
    if (patch.studentNo) body.studentNo = patch.studentNo;
    if (patch.title) body.title = patch.title;
    if (patch.content) body.content = patch.content;
    if (patch.status) body.status = patch.status;
    return api("poems", { method: "PUT", body: JSON.stringify(body) }).then(function () {
      if (patch.studentNo) { p.studentNo = patch.studentNo; var s = getStudent(patch.studentNo); if (s) p.author = s.name; }
      if (patch.title) p.title = patch.title;
      if (patch.content) p.content = patch.content;
      if (patch.status) p.status = patch.status;
      return { ok: true, msg: "诗歌已更新" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function deletePoem(id) {
    if (!isAdmin()) return Promise.resolve({ ok: false, msg: "需要管理员权限" });
    return api("poems?id=" + encodeURIComponent(id), { method: "DELETE" }).then(function () {
      var idx = cache.poems.findIndex(function (p) { return String(p.id) === String(id); });
      if (idx !== -1) cache.poems.splice(idx, 1);
      return { ok: true, msg: "诗歌已删除" };
    }).catch(function (e) { return { ok: false, msg: e.message }; });
  }

  /* ---------- 密钥管理（管理员）---------- */
  function saveSecrets(data) {
    return api("secrets", {
      method: "POST",
      body: JSON.stringify(data)
    }).then(function () { return { ok: true }; })
      .catch(function (e) { return { ok: false, msg: e.message }; });
  }
  function checkSecrets() {
    return api("secrets").then(function (data) { return data; })
      .catch(function () { return { hasOpenrouterKey: false, hasGithubToken: false }; });
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
      { href: "ai.html", t: "AI 助手", a: "ai" },
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
    setTimeout(hide, 3000);
  }

  /* ---------- 导出 ---------- */
  global.SZX = {
    CONFIG: CONFIG,
    SCHEDULE: SCHEDULE, getSubjectColor: getSubjectColor,
    loadAll: loadAll, loadAllContents: loadAllContents, loadAllPoems: loadAllPoems,
    bp: bp,
    getAllStudents: getAllStudents, getStudent: getStudent,
    getPoems: getPoems, getPoemsByStudent: getPoemsByStudent,
    getContents: getContents, getAllContents: getAllContents,
    getContentsByStudent: getContentsByStudent, getPendingContents: getPendingContents,
    getRecentContents: getRecentContents,
    loginStudent: loginStudent, loginAdmin: loginAdmin, logout: logout, setAdminSession: setAdminSession,
    getSession: getSessionUser, isStudent: isStudent, isAdmin: isAdmin, currentStudentNo: currentStudentNo,
    getToken: getToken, setToken: setToken, isLocked: isLocked,
    updateStudent: updateStudent, addStudent: addStudent, deleteStudent: deleteStudent,
    addPoem: addPoem, updatePoem: updatePoem, deletePoem: deletePoem,
    uploadContent: uploadContent,
    approveContent: approveContent, rejectContent: rejectContent, deleteContent: deleteContent,
    saveSecrets: saveSecrets, checkSecrets: checkSecrets,
    isApiOnline: function () { return cache.apiOnline; },
    api: api,
    contentCount: contentCount, poemCount: poemCount,
    escapeHtml: escapeHtml, fmtDate: fmtDate, fmtSize: fmtSize,
    statusLabel: statusLabel, statusClass: statusClass,
    toast: toast,
    mountNav: mountNav, mountFooter: mountFooter, showSplash: showSplash
  };
})(window);
