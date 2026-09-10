# 尚志中学 2024 届 09 班班级官方网站

这是为尚志中学 2024 届 09 班（48 人）搭建的班级官方网站项目骨架。采用 Next.js + Tailwind + Prisma (SQLite 开发，生产可切换到 PostgreSQL) 的全栈方案，包含学生登录（学号）、管理员账号、学生个人页与诗歌存储模型。

主要特性（MVP）：
- 学号登录（学号直接登录，建议后续加 PIN/密码）
- 管理员账号（可管理学生与诗歌）
- 每位学生有个人页面，未来可上传诗歌并由管理员审核
- Prisma ORM + SQLite（开发）

快速开始（本地开发）
1. 克隆仓库并切换到分支 feature/class-website
2. 安装依赖：
   npm install
3. 生成 Prisma 客户端并初始化数据库：
   npx prisma migrate dev --name init
4. 运行种子脚本（会创建管理员和示例学生）：
   node prisma/seed.js
5. 启动开发服务器：
   npm run dev

默认管理员（seed 脚本会创建，或在 .env 指定）
- username: admin
- password: admin1234

部署建议
- 生产建议使用 PostgreSQL，修改 prisma/schema.prisma provider 为 "postgresql" 并设置 DATABASE_URL。
- 推荐部署平台：Vercel（前端 + API）、或 Docker 到 VPS。

后续计划
- 学生初次登录需设置密码
- 诗歌上传（文本/图片）和审核流（草稿 -> 审核 -> 发布）
- 学生可自由编辑个人简介与诗歌

