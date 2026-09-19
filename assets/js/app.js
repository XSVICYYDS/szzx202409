/* =====================================================================
   尚志中学 2024 届 09 班班级官方网站 — 前端共享脚本
   架构：诗歌以仓库内 data/poems.json 为「共享基准」（所有访客可见），
        管理员本地编辑作为「暂存」存于 localStorage；
        导出合并后的 poems.json 并提交到 GitHub，即可让所有人看到。
   ===================================================================== */

(function (global) {
  "use strict";

  /* ---------- 常量 ---------- */
  var CLASS_NAME = "尚志中学 2024 届 09 班";
  var TOTAL = 48;
  var ADMIN = { username: "szzx202409", password: "szzx202409" };

  var POEMS_LOCAL_KEY = "szzx202409_poems_local"; // 管理员本地暂存（未提交）
  var PROFILES_KEY = "szzx202409_profiles";        // 学生资料覆盖
  var SESSION_KEY = "szzx202409_session";          // 登录会话
  var SHARED_URL = "data/poems.json";              // 共享诗歌文件（仓库内）

  /* ---------- 学生基础数据（48 人，来自真实花名册） ---------- */
  var STUDENT_NAMES = [
    "张维员","郑烁","可思诚","蔡育希","方志杰","胡云航","李伟祺","刘书豪",
    "刘自然","尹子藤","罗天祺","吕世良","宋毅","汪子瀚","王振瑄","翁浩然",
    "吴子轩","肖景天","徐慎","张珏","张天佑","张雨泽","郑浩宇","郑皓哲",
    "周逸","朱嘉轩","庄皓哲","蔡欣雅","陈依瑶","陈庄睿","范欣怡","范奕颖",
    "方星睿","李梓瑶","梁曼羲","刘洋","刘艺馨","马绮羲","秦馨媛","汪佳川",
    "杨佳妮","杨笔纤","章煜情","郑贻","郑艺歆","郑媛月","周芷妍","朱诗涵"
  ];
  var STUDENTS = STUDENT_NAMES.map(function (name, i) {
    var n = i + 1;
    var sf = String(n).padStart(2, "0");
    return {
      studentNo: "202409" + String(n).padStart(3, "0"), // 202409001 … 202409048
      name: name,
      username: "szzx2024" + sf,
      bio: name + " 同学，尚志中学 2024 届 09 班。"
    };
  });

  /* ---------- 课程表数据（来自尚志中学909班课程表_完整版.xlsx，夏令时） ---------- */
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

  // 科目配色（柔和色块，便于快速定位）
  var SUBJECT_COLORS = {
    "语文":     { bg: "#fdf1e8", fg: "#b15a00" },
    "数学":     { bg: "#eef2fa", fg: "#1f3a5f" },
    "英语":     { bg: "#e9f6ee", fg: "#2f7d52" },
    "科学":     { bg: "#f3edfb", fg: "#6a3da6" },
    "历史":     { bg: "#fbe6e1", fg: "#a0421f" },
    "地理":     { bg: "#e4f3ef", fg: "#1f6f5a" },
    "道德与法治": { bg: "#fbeef4", fg: "#9b2a5c" },
    "体育与健康": { bg: "#e8f5fb", fg: "#1c6b93" },
    "音乐":     { bg: "#f5ecff", fg: "#7a44b8" },
    "美术":     { bg: "#fff0f5", fg: "#b23a6b" },
    "劳动":     { bg: "#f0f7e8", fg: "#4a7a2a" },
    "综合实践1": { bg: "#eef6f7", fg: "#2a6f7a" },
    "综合实践2": { bg: "#f5f0e6", fg: "#7a5a2a" },
    "校本（口语）": { bg: "#eaf2fb", fg: "#2a5a7a" },
    "校本（阅读）": { bg: "#f2ecfb", fg: "#5a2a7a" },
    "班队（心理）": { bg: "#fbeceb", fg: "#9a3a3a" }
  };
  function getSubjectColor(subject) {
    return SUBJECT_COLORS[subject] || { bg: "#f1ece0", fg: "#5b6675" };
  }

  /* ---------- 工具 ---------- */
  function read(key, fallback) {
    try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* 学生资料：基础 + 管理员覆盖 */
  function getProfiles() { return read(PROFILES_KEY, {}); }
  function getStudent(no) {
    var base = STUDENTS.find(function (s) { return s.studentNo === no; });
    if (!base) return null;
    var override = getProfiles()[no] || {};
    return Object.assign({}, base, override);
  }
  function getAllStudents() {
    return STUDENTS.map(function (s) { return getStudent(s.studentNo); });
  }
  function setStudentProfile(no, patch) {
    var p = getProfiles();
    p[no] = Object.assign({}, p[no] || {}, patch);
    write(PROFILES_KEY, p);
  }

  /* ---------- 诗歌：共享基准 + 本地暂存 ---------- */
  var SHARED = [];        // 来自 data/poems.json（所有访客一致）
  var sharedLoaded = false;

  function loadShared() {
    // 返回 Promise；fetch 失败（如本地 file://）则静默降级为空
    return fetch(SHARED_URL, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (arr) {
        SHARED = Array.isArray(arr) ? arr : [];
        sharedLoaded = true;
        return SHARED;
      })
      .catch(function () { sharedLoaded = true; SHARED = []; return SHARED; });
  }
  function sharedReady() { return sharedLoaded; }

  function getLocalPoems() { return read(POEMS_LOCAL_KEY, []); }
  function setLocalPoems(arr) { write(POEMS_LOCAL_KEY, arr); }

  // 合并：共享 + 本地暂存，标注来源
  function getPoems() {
    var shared = SHARED.map(function (p) { return Object.assign({}, p, { __source: "shared" }); });
    var local = getLocalPoems().map(function (p) { return Object.assign({}, p, { __source: "local" }); });
    return shared.concat(local);
  }
  function getPoemsByStudent(no) {
    return getPoems().filter(function (p) { return p.studentNo === no; });
  }
  function getPoem(id) {
    return getPoems().find(function (p) { return String(p.id) === String(id); }) || null;
  }

  // 仅对「本地暂存」做增删改（共享部分请编辑 data/poems.json）
  function addPoem(data) {
    var local = getLocalPoems();
    var st = getStudent(data.studentNo);
    var item = {
      id: "local_" + Date.now(),
      studentNo: data.studentNo,
      title: (data.title || "未命名").trim(),
      content: (data.content || "").trim(),
      author: st ? st.name : "未知",
      status: data.status || "published",
      createdAt: new Date().toISOString()
    };
    local.push(item);
    setLocalPoems(local);
    return item;
  }
  function updatePoem(id, patch) {
    var local = getLocalPoems();
    var idx = local.findIndex(function (p) { return String(p.id) === String(id); });
    if (idx === -1) return null; // 仅能编辑本地暂存项
    var stNo = patch.studentNo || local[idx].studentNo;
    var st = getStudent(stNo);
    local[idx] = Object.assign({}, local[idx], patch, { author: st ? st.name : local[idx].author });
    setLocalPoems(local);
    return local[idx];
  }
  function deletePoem(id) {
    var local = getLocalPoems().filter(function (p) { return String(p.id) !== String(id); });
    setLocalPoems(local);
  }
  function clearLocalPoems() { try { localStorage.removeItem(POEMS_LOCAL_KEY); } catch (e) {} }

  // 导出合并后的 poems.json 文本（提交到 GitHub 即可让所有人看到）
  function exportPoemsJson() {
    var all = getPoems().map(function (p) {
      var c = Object.assign({}, p);
      delete c.__source;
      return c;
    });
    return JSON.stringify(all, null, 2);
  }

  /* ---------- 登录会话 ---------- */
  function loginStudent(no) {
    var s = STUDENTS.find(function (x) { return x.studentNo === no; });
    if (!s) return { ok: false, msg: "学号不存在，请输入 202409001~202409048" };
    write(SESSION_KEY, { role: "student", studentNo: no, at: Date.now() });
    return { ok: true, student: getStudent(no) };
  }
  function loginAdmin(u, p) {
    if (u === ADMIN.username && p === ADMIN.password) {
      write(SESSION_KEY, { role: "admin", at: Date.now() });
      return { ok: true };
    }
    return { ok: false, msg: "管理员账号或密码错误" };
  }
  function getSession() { return read(SESSION_KEY, null); }
  function isStudent() { var s = getSession(); return !!s && s.role === "student"; }
  function isAdmin() { var s = getSession(); return !!s && s.role === "admin"; }
  function currentStudentNo() { var s = getSession(); return s && s.role === "student" ? s.studentNo : null; }
  function logout() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }

  /* ---------- 公共组件 ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtDate(iso) {
    try { var d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    catch (e) { return ""; }
  }

  function renderNav(active) {
    var s = getSession();
    var who = "";
    if (s && s.role === "student") who = '<span class="who">学号 ' + escapeHtml(s.studentNo) + '</span>';
    if (s && s.role === "admin") who = '<span class="who">管理员</span>';

    var links = [
      { href: "index.html", t: "首页", a: "home" },
      { href: "students.html", t: "同学名录", a: "students" },
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
      e.preventDefault(); logout(); location.href = "index.html";
    });
  }
  function renderFooter() {
    return '<footer class="site-foot"><div class="wrap"><p>' + CLASS_NAME + ' · 班级官方网站</p>' +
      '<p class="muted">本站为静态站点，诗歌共享数据存放于仓库内 data/poems.json。' + new Date().getFullYear() + '</p></div></footer>';
  }
  function mountFooter() {
    var el = document.getElementById("footer");
    if (el) el.innerHTML = renderFooter();
  }

  /* ---------- 导出 ---------- */
  global.SZX = {
    CLASS_NAME: CLASS_NAME, TOTAL: TOTAL, ADMIN_USERNAME: ADMIN.username,
    STUDENTS: STUDENTS, SCHEDULE: SCHEDULE, getSubjectColor: getSubjectColor,
    loadShared: loadShared, sharedReady: sharedReady,
    getAllStudents: getAllStudents, getStudent: getStudent, setStudentProfile: setStudentProfile,
    getPoems: getPoems, getPoemsByStudent: getPoemsByStudent, getPoem: getPoem,
    addPoem: addPoem, updatePoem: updatePoem, deletePoem: deletePoem,
    clearLocalPoems: clearLocalPoems, exportPoemsJson: exportPoemsJson,
    loginStudent: loginStudent, loginAdmin: loginAdmin, getSession: getSession,
    isStudent: isStudent, isAdmin: isAdmin, currentStudentNo: currentStudentNo, logout: logout,
    escapeHtml: escapeHtml, fmtDate: fmtDate,
    mountNav: mountNav, mountFooter: mountFooter
  };
})(window);
