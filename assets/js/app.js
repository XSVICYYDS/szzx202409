/* =====================================================================
   尚志中学 2024 届 09 班班级官方网站 — 前端共享脚本 v2
   架构：动态网站，数据通过后端 API 获取/提交
   功能：学生管理、内容上传（图片/文字/Word）、审批工作流
   ===================================================================== */

(function (global) {
  "use strict";

  var CLASS_NAME = "尚志中学 2024 届 09 班";
  var TOTAL = 48;

  /* ---------- 课程表数据（静态，来自 Excel） ---------- */
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
      { period: "第五节",   time: "13:15-13:55", subs: ["道德与法治","劳动","语文","音乐","数学"] },
      { period: "第六节",   time: "14:10-14:50", subs: ["体育与健康","科学","地理","校本（口语）","历史"] },
      { period: "第七节",   time: "15:05-15:45", subs: ["综合实践2","体育与健康","综合实践1","校本（阅读）","班队（心理）"] },
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
    "综合实践1": { bg: "#eef6f7", fg: "#2a6f7a" },
    "综合实践2": { bg: "#f5f0e6", fg: "#7a5a2a" },
    "校本（口语）": { bg: "#eaf2fb", fg: "#2a5a7a" },
    "校本（阅读）": { bg: "#f2ecfb", fg: "#5a2a7a" },
    "班队（心理）": { bg: "#fbeceb", fg: "#9a3a3a" }
  };
  function getSubjectColor(subject) {
    return SUBJECT_COLORS[subject] || { bg: "#f1ece0", fg: "#5b6675" };
  }

  /* ---------- API 辅助 ---------- */
  function api(method, url, body, isForm) {
    var opts = { method: method, credentials: "same-origin" };
    if (body && !isForm) {
      opts.headers = { "Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    } else if (isForm) {
      opts.body = body; // FormData 对象
    }
    return fetch(url, opts).then(function (r) { return r.json(); });
  }
  var GET = function (u) { return api("GET", u); };
  var POST = function (u, b) { return api("POST", u, b); };
  var PUT = function (u, b) { return api("PUT", u, b); };
  var DEL = function (u) { return api("DELETE", u); };

  /* ---------- 内存缓存 ---------- */
  var cache = {
    students: [],
    poems: [],
    contents: [],
    session: null,
    loaded: false
  };

  /* ---------- 加载全部数据 ---------- */
  function loadAll() {
    return Promise.all([
      GET("/api/students"),
      GET("/api/poems"),
      GET("/api/contents"),
      GET("/api/auth/session")
    ]).then(function (results) {
      cache.students = results[0].ok ? results[0].students : [];
      cache.poems = results[1].ok ? results[1].poems : [];
      cache.contents = results[2].ok ? results[2].contents : [];
      cache.session = results[3].ok ? results[3].user : null;
      cache.loaded = true;
      return cache;
    }).catch(function () {
      cache.loaded = true;
      return cache;
    });
  }

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
  function getPoem(id) {
    return cache.poems.find(function (p) { return String(p.id) === String(id); }) || null;
  }

  /* ---------- 内容数据 ---------- */
  function getContents() { return cache.contents; }
  function getContentsByStudent(no) {
    return cache.contents.filter(function (c) { return c.studentNo === no; });
  }
  function getRecentContents(n) {
    return cache.contents.slice().sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }).slice(0, n || 6);
  }

  /* ---------- 会话/认证 ---------- */
  function getSession() { return cache.session; }
  function isAdmin() { return cache.session && cache.session.role === "admin"; }
  function isStudent() { return cache.session && cache.session.role === "student"; }
  function currentStudentNo() { return cache.session && cache.session.role === "student" ? cache.session.studentNo : null; }

  function loginStudent(no) {
    return POST("/api/auth/student-login", { studentNo: no }).then(function (r) {
      if (r.ok) { cache.session = { role: "student", studentNo: no, name: r.student.name }; }
      return r;
    });
  }
  function loginAdmin(u, p) {
    return POST("/api/auth/admin-login", { username: u, password: p }).then(function (r) {
      if (r.ok) { cache.session = { role: "admin", username: u }; }
      return r;
    });
  }
  function logout() {
    return POST("/api/auth/logout").then(function () { cache.session = null; });
  }

  /* ---------- 学生管理 API ---------- */
  function updateStudent(no, patch) {
    return PUT("/api/students/" + encodeURIComponent(no), patch);
  }
  function addStudent(data) {
    return POST("/api/students", data);
  }
  function deleteStudent(no) {
    return DEL("/api/students/" + encodeURIComponent(no));
  }

  /* ---------- 诗歌管理 API ---------- */
  function addPoem(data) {
    return POST("/api/poems", data);
  }
  function updatePoem(id, patch) {
    return PUT("/api/poems/" + id, patch);
  }
  function deletePoem(id) {
    return DEL("/api/poems/" + id);
  }

  /* ---------- 内容上传 API ---------- */
  function uploadContent(formData) {
    return fetch("/api/contents/upload", {
      method: "POST",
      credentials: "same-origin",
      body: formData
    }).then(function (r) { return r.json(); });
  }

  /* ---------- 审批 API ---------- */
  function approveContent(id) {
    return PUT("/api/contents/" + id + "/approve");
  }
  function rejectContent(id, reason) {
    return PUT("/api/contents/" + id + "/reject", { reason: reason });
  }
  function deleteContent(id) {
    return DEL("/api/contents/" + id);
  }
  function getPendingContents() {
    return GET("/api/contents/pending");
  }
  function getAllContents() {
    return GET("/api/contents/all");
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

  /* ---------- 公共组件 ---------- */
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
      '<a class="brand" href="index.html"><span class="brand-mark">09</span><span class="brand-text">' + CLASS_NAME + '</span></a>' +
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
    return '<footer class="site-foot"><div class="wrap"><p>' + CLASS_NAME + ' · 班级官方网站</p>' +
      '<p class="muted">本站为动态网站，支持内容上传与审批。' + new Date().getFullYear() + '</p></div></footer>';
  }
  function mountFooter() {
    var el = document.getElementById("footer");
    if (el) el.innerHTML = renderFooter();
  }

  /* ---------- 导出 ---------- */
  global.SZX = {
    CLASS_NAME: CLASS_NAME, TOTAL: TOTAL,
    SCHEDULE: SCHEDULE, getSubjectColor: getSubjectColor,
    loadAll: loadAll,
    getAllStudents: getAllStudents, getStudent: getStudent,
    getPoems: getPoems, getPoemsByStudent: getPoemsByStudent, getPoem: getPoem,
    getContents: getContents, getContentsByStudent: getContentsByStudent, getRecentContents: getRecentContents,
    loginStudent: loginStudent, loginAdmin: loginAdmin, logout: logout,
    getSession: getSession, isStudent: isStudent, isAdmin: isAdmin, currentStudentNo: currentStudentNo,
    updateStudent: updateStudent, addStudent: addStudent, deleteStudent: deleteStudent,
    addPoem: addPoem, updatePoem: updatePoem, deletePoem: deletePoem,
    uploadContent: uploadContent,
    approveContent: approveContent, rejectContent: rejectContent, deleteContent: deleteContent,
    getPendingContents: getPendingContents, getAllContents: getAllContents,
    escapeHtml: escapeHtml, fmtDate: fmtDate, fmtSize: fmtSize,
    statusLabel: statusLabel, statusClass: statusClass,
    mountNav: mountNav, mountFooter: mountFooter,
    api: { GET: GET, POST: POST, PUT: PUT, DEL: DEL }
  };
})(window);
