/* =====================================================================
   尚志中学 2024 届 09 班 — 动态网站后端
   功能：学生管理、内容上传（图片/文字/Word）、审批工作流、会话认证
   存储：JSON 文件（无需数据库，轻量便携）
   ===================================================================== */

const express = require("express");
const session = require("express-session");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------- 文件存储 ---------- */
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- JSON 数据库 ---------- */
function loadDB() {
  if (fs.existsSync(DB_FILE)) {
    try { return JSON.parse(fs.readFileSync(DB_FILE, "utf-8")); }
    catch (e) { console.error("db.json 解析失败，重建:", e.message); }
  }
  return { admins: [], students: [], contents: [], poems: [], _seq: { content: 0, poem: 0, student: 0 } };
}
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
}
let DB = loadDB();

/* ---------- 种子数据 ---------- */
function seedDB() {
  let changed = false;
  // 管理员
  if (DB.admins.length === 0) {
    DB.admins.push({
      id: 1, username: "szzx202409",
      passwordHash: bcrypt.hashSync("szzx202409", 10),
      createdAt: new Date().toISOString()
    });
    changed = true;
    console.log("[DB] 已创建管理员: szzx202409 / szzx202409");
  }
  // 48 名学生
  if (DB.students.length === 0) {
    const names = [
      "张维员","郑烁","可思诚","蔡育希","方志杰","胡云航","李伟祺","刘书豪",
      "刘自然","尹子藤","罗天祺","吕世良","宋毅","汪子瀚","王振瑄","翁浩然",
      "吴子轩","肖景天","徐慎","张珏","张天佑","张雨泽","郑浩宇","郑皓哲",
      "周逸","朱嘉轩","庄皓哲","蔡欣雅","陈依瑶","陈庄睿","范欣怡","范奕颖",
      "方星睿","李梓瑶","梁曼羲","刘洋","刘艺馨","马绮羲","秦馨媛","汪佳川",
      "杨佳妮","杨笔纤","章煜情","郑贻","郑艺歆","郑媛月","周芷妍","朱诗涵"
    ];
    const now = new Date().toISOString();
    names.forEach((name, i) => {
      const n = i + 1;
      DB.students.push({
        id: n,
        studentNo: "202409" + String(n).padStart(3, "0"),
        name: name,
        username: "szzx2024" + String(n).padStart(2, "0"),
        bio: name + " 同学，尚志中学 2024 届 09 班。",
        createdAt: now
      });
    });
    DB._seq.student = names.length;
    changed = true;
    console.log("[DB] 已导入 " + names.length + " 名学生");
  }
  // 从 poems.json 迁移
  if (DB.poems.length === 0) {
    const poemsPath = path.join(DATA_DIR, "poems.json");
    if (fs.existsSync(poemsPath)) {
      try {
        const poems = JSON.parse(fs.readFileSync(poemsPath, "utf-8"));
        if (Array.isArray(poems) && poems.length > 0) {
          poems.forEach((p, i) => {
            DB.poems.push({
              id: i + 1,
              studentNo: p.studentNo || "",
              title: p.title || "未命名",
              content: p.content || "",
              author: p.author || "未知",
              status: p.status || "published",
              createdAt: p.createdAt || new Date().toISOString()
            });
          });
          DB._seq.poem = poems.length;
          changed = true;
          console.log("[DB] 已从 poems.json 导入 " + poems.length + " 首诗歌");
        }
      } catch (e) { console.log("[DB] poems.json 迁移跳过:", e.message); }
    }
  }
  if (changed) saveDB();
}
seedDB();

/* ---------- 中间件 ---------- */
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));
app.use(session({
  secret: "szzx202409-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(__dirname, { index: "index.html" }));
app.use("/uploads", express.static(UPLOAD_DIR));

/* ---------- 认证中间件 ---------- */
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ ok: false, msg: "请先登录" });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.status(403).json({ ok: false, msg: "需要管理员权限" });
  next();
}

/* ---------- 工具 ---------- */
function nextId(key) { DB._seq[key] = (DB._seq[key] || 0) + 1; return DB._seq[key]; }
function findStudent(no) { return DB.students.find(s => s.studentNo === no); }
function formatContent(c) {
  return {
    id: c.id, type: c.type, title: c.title, content: c.content,
    filePath: c.filePath, originalFilename: c.originalFilename,
    mimeType: c.mimeType, fileSize: c.fileSize,
    studentNo: c.studentNo, authorName: c.authorName,
    uploadedBy: c.uploadedBy, status: c.status,
    rejectReason: c.rejectReason,
    createdAt: c.createdAt, approvedAt: c.approvedAt, approvedBy: c.approvedBy
  };
}

/* ===================================================================
   API 路由
   =================================================================== */

/* ---------- 认证 ---------- */
app.post("/api/auth/student-login", (req, res) => {
  const { studentNo } = req.body;
  if (!studentNo) return res.json({ ok: false, msg: "请输入学号" });
  const stu = findStudent(studentNo);
  if (!stu) return res.json({ ok: false, msg: "学号不存在" });
  req.session.user = { role: "student", studentNo: stu.studentNo, name: stu.name };
  res.json({ ok: true, student: { studentNo: stu.studentNo, name: stu.name, bio: stu.bio } });
});

app.post("/api/auth/admin-login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ ok: false, msg: "请输入账号和密码" });
  const admin = DB.admins.find(a => a.username === username);
  if (!admin || !bcrypt.compareSync(password, admin.passwordHash))
    return res.json({ ok: false, msg: "管理员账号或密码错误" });
  req.session.user = { role: "admin", username: admin.username };
  res.json({ ok: true });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/auth/session", (req, res) => {
  res.json({ ok: true, user: req.session.user || null });
});

/* ---------- 学生管理 ---------- */
app.get("/api/students", (req, res) => {
  const poemCount = {}, contentCount = {};
  DB.poems.forEach(p => { if (p.status === "published") poemCount[p.studentNo] = (poemCount[p.studentNo] || 0) + 1; });
  DB.contents.forEach(c => { if (c.status === "approved") contentCount[c.studentNo] = (contentCount[c.studentNo] || 0) + 1; });
  res.json({
    ok: true,
    students: DB.students.map(s => ({
      studentNo: s.studentNo, name: s.name, username: s.username,
      bio: s.bio, createdAt: s.createdAt,
      poemCount: poemCount[s.studentNo] || 0,
      contentCount: contentCount[s.studentNo] || 0
    }))
  });
});

app.get("/api/students/:no", (req, res) => {
  const s = findStudent(req.params.no);
  if (!s) return res.json({ ok: false, msg: "学生不存在" });
  res.json({ ok: true, student: { studentNo: s.studentNo, name: s.name, username: s.username, bio: s.bio, createdAt: s.createdAt } });
});

app.put("/api/students/:no", requireAdmin, (req, res) => {
  const s = findStudent(req.params.no);
  if (!s) return res.json({ ok: false, msg: "学生不存在" });
  const { name, studentNo, bio } = req.body;
  if (studentNo && studentNo !== s.studentNo) {
    if (findStudent(studentNo)) return res.json({ ok: false, msg: "学号已被使用" });
    const oldNo = s.studentNo;
    DB.contents.forEach(c => { if (c.studentNo === oldNo) c.studentNo = studentNo; });
    DB.poems.forEach(p => { if (p.studentNo === oldNo) p.studentNo = studentNo; });
    s.studentNo = studentNo;
  }
  if (name) s.name = name;
  if (bio !== undefined) s.bio = bio;
  saveDB();
  res.json({ ok: true, msg: "学生信息已更新" });
});

app.post("/api/students", requireAdmin, (req, res) => {
  const { studentNo, name, bio } = req.body;
  if (!studentNo || !name) return res.json({ ok: false, msg: "学号和姓名不能为空" });
  if (findStudent(studentNo)) return res.json({ ok: false, msg: "学号已存在" });
  DB.students.push({
    id: nextId("student"), studentNo, name,
    username: "szzx" + studentNo.slice(-4),
    bio: bio || name + " 同学，尚志中学 2024 届 09 班。",
    createdAt: new Date().toISOString()
  });
  saveDB();
  res.json({ ok: true, msg: "学生已添加" });
});

app.delete("/api/students/:no", requireAdmin, (req, res) => {
  const idx = DB.students.findIndex(s => s.studentNo === req.params.no);
  if (idx === -1) return res.json({ ok: false, msg: "学生不存在" });
  DB.students.splice(idx, 1);
  saveDB();
  res.json({ ok: true, msg: "学生已删除" });
});

/* ---------- 内容上传与审批 ---------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.mimetype.startsWith("image/") ? "images" : "docs";
    const dir = path.join(UPLOAD_DIR, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("不支持的文件类型: " + file.mimetype));
  }
});

app.post("/api/contents/upload", requireAuth, upload.single("file"), (req, res) => {
  const { title, content, type, studentNo: bodyNo } = req.body;
  const user = req.session.user;

  let contentType = type || "text";
  let filePath = null, originalFilename = null, mimeType = null, fileSize = null;

  if (req.file) {
    contentType = req.file.mimetype.startsWith("image/") ? "image" : "word";
    filePath = path.relative(__dirname, req.file.path).replace(/\\/g, "/");
    originalFilename = req.file.originalname;
    mimeType = req.file.mimetype;
    fileSize = req.file.size;
  }

  if (!title) return res.status(400).json({ ok: false, msg: "标题不能为空" });
  if (contentType === "text" && !content) return res.status(400).json({ ok: false, msg: "文字内容不能为空" });

  let studentNo, authorName;
  if (user.role === "student") {
    studentNo = user.studentNo;
    const stu = findStudent(studentNo);
    authorName = stu ? stu.name : "未知";
  } else {
    studentNo = bodyNo || "admin";
    const stu = studentNo !== "admin" ? findStudent(studentNo) : null;
    authorName = stu ? stu.name : "管理员";
  }

  const status = user.role === "admin" ? "approved" : "pending";

  const item = {
    id: nextId("content"), type: contentType, title, content: content || null,
    filePath, originalFilename, mimeType, fileSize,
    studentNo, authorName, uploadedBy: user.role,
    status, rejectReason: null,
    createdAt: new Date().toISOString(),
    approvedAt: status === "approved" ? new Date().toISOString() : null,
    approvedBy: status === "approved" ? user.username || "admin" : null
  };
  DB.contents.push(item);
  saveDB();

  res.json({
    ok: true,
    msg: status === "approved" ? "内容已直接发布" : "内容已提交，等待管理员审批",
    id: item.id, status
  });
});

app.get("/api/contents", (req, res) => {
  const { type, studentNo } = req.query;
  let list = DB.contents.filter(c => c.status === "approved");
  if (type) list = list.filter(c => c.type === type);
  if (studentNo) list = list.filter(c => c.studentNo === studentNo);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, contents: list.map(formatContent) });
});

app.get("/api/contents/pending", requireAdmin, (req, res) => {
  const list = DB.contents.filter(c => c.status === "pending")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, contents: list.map(formatContent) });
});

app.get("/api/contents/all", requireAdmin, (req, res) => {
  const list = DB.contents.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, contents: list.map(formatContent) });
});

app.get("/api/contents/student/:no", (req, res) => {
  const no = req.params.no;
  const isOwner = req.session.user && req.session.user.studentNo === no;
  const isAdmin = req.session.user && req.session.user.role === "admin";
  let list = DB.contents.filter(c => c.studentNo === no);
  if (!isOwner && !isAdmin) list = list.filter(c => c.status === "approved");
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, contents: list.map(formatContent) });
});

app.put("/api/contents/:id/approve", requireAdmin, (req, res) => {
  const c = DB.contents.find(x => x.id === parseInt(req.params.id));
  if (!c) return res.json({ ok: false, msg: "内容不存在" });
  c.status = "approved";
  c.approvedAt = new Date().toISOString();
  c.approvedBy = req.session.user.username;
  c.rejectReason = null;
  saveDB();
  res.json({ ok: true, msg: "内容已审批通过" });
});

app.put("/api/contents/:id/reject", requireAdmin, (req, res) => {
  const c = DB.contents.find(x => x.id === parseInt(req.params.id));
  if (!c) return res.json({ ok: false, msg: "内容不存在" });
  c.status = "rejected";
  c.rejectReason = req.body.reason || "未通过审批";
  c.approvedAt = new Date().toISOString();
  c.approvedBy = req.session.user.username;
  saveDB();
  res.json({ ok: true, msg: "内容已拒绝" });
});

app.delete("/api/contents/:id", (req, res) => {
  const idx = DB.contents.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, msg: "内容不存在" });
  const c = DB.contents[idx];
  const isAdmin = req.session.user && req.session.user.role === "admin";
  const isOwner = req.session.user && req.session.user.studentNo === c.studentNo;
  if (!isAdmin && !isOwner) return res.status(403).json({ ok: false, msg: "无权删除" });
  if (c.filePath) {
    const fp = path.join(__dirname, c.filePath);
    if (fs.existsSync(fp)) { try { fs.unlinkSync(fp); } catch (e) {} }
  }
  DB.contents.splice(idx, 1);
  saveDB();
  res.json({ ok: true, msg: "内容已删除" });
});

/* ---------- 诗歌管理 ---------- */
app.get("/api/poems", (req, res) => {
  const list = DB.poems.filter(p => p.status === "published")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, poems: list });
});

app.get("/api/poems/student/:no", (req, res) => {
  const list = DB.poems.filter(p => p.studentNo === req.params.no && p.status === "published")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ ok: true, poems: list });
});

app.post("/api/poems", requireAdmin, (req, res) => {
  const { studentNo, title, content, status } = req.body;
  const stu = findStudent(studentNo);
  DB.poems.push({
    id: nextId("poem"), studentNo,
    title: title || "未命名", content: content || "",
    author: stu ? stu.name : "未知", status: status || "published",
    createdAt: new Date().toISOString()
  });
  saveDB();
  res.json({ ok: true, msg: "诗歌已添加" });
});

app.put("/api/poems/:id", requireAdmin, (req, res) => {
  const p = DB.poems.find(x => x.id === parseInt(req.params.id));
  if (!p) return res.json({ ok: false, msg: "诗歌不存在" });
  const { studentNo, title, content, status } = req.body;
  const stu = findStudent(studentNo || p.studentNo);
  if (studentNo) p.studentNo = studentNo;
  if (title) p.title = title;
  if (content) p.content = content;
  if (status) p.status = status;
  if (stu) p.author = stu.name;
  saveDB();
  res.json({ ok: true, msg: "诗歌已更新" });
});

app.delete("/api/poems/:id", requireAdmin, (req, res) => {
  const idx = DB.poems.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, msg: "诗歌不存在" });
  DB.poems.splice(idx, 1);
  saveDB();
  res.json({ ok: true, msg: "诗歌已删除" });
});

/* ---------- 启动 ---------- */
app.listen(PORT, () => {
  console.log(`\n  尚志中学 09 班动态网站已启动`);
  console.log(`  访问地址: http://localhost:${PORT}`);
  console.log(`  管理员: szzx202409 / szzx202409\n`);
});
