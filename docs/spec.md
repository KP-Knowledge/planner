# Planner — Spec v1

Web application สำหรับวางแผนงานและโปรเจคในรูปแบบ Gantt chart ธีมอิง [Instagantt](https://www.instagantt.com)

## 1. ผู้ใช้และ Auth

- องค์กรเดียว ทุกคนเห็นและแก้ไขได้ทุกโปรเจค ไม่มี role
- Login ผ่าน Keycloak ที่มีอยู่แล้ว ด้วย Auth.js v5 (Keycloak provider, confidential client) session เก็บเป็น JWT ใน cookie
- Logout ผ่าน `end_session_endpoint` ของ Keycloak
- ตอน login ระบบ upsert ผู้ใช้ลงตาราง `users` (keycloak `sub`, ชื่อ, email, avatar) assign งานได้เฉพาะคนที่เคย login แล้ว
- Env: `KEYCLOAK_ISSUER`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_URL`
- Redirect URI ของ client: `https://<domain>/api/auth/callback/keycloak` (ขั้นตอนตั้งค่าอยู่ใน README)

## 2. ข้อมูล

| Entity | Field หลัก |
|---|---|
| Project | ชื่อ, คำอธิบาย, `archivedAt` |
| Section | project, ชื่อ, ลำดับ |
| Task | section, `parentId` (subtask), ชื่อ, คำอธิบาย, `startDate`, `endDate`, progress %, `isMilestone`, `teamId`, `color` (override), ลำดับ |
| TaskAssignee | task, user (หลายคนต่อ task) |
| Dependency | `predecessorId`, `successorId` แบบ finish-to-start เท่านั้น |
| Team | ชื่อ, สี (ไม่เก็บสมาชิก) |
| Holiday | วันที่, ชื่อ, `projectId` (null = ทั้งองค์กร), `source` (`seed` / `custom`) |
| User | keycloak `sub`, ชื่อ, email, avatar |

- Milestone คือ task ที่ `startDate = endDate` และ `isMilestone = true` แสดงเป็นรูปเพชร
- สีของ task ใช้ `color` ถ้ามี ถ้าไม่มีใช้สีของทีม ถ้าไม่มีทีมใช้สี default
- Project archive ได้ (soft delete) ส่วนลบถาวรต้องกดยืนยันอีกครั้ง
- Dependency ห้ามเกิดวงวน (cycle) ตรวจที่ API

## 3. วันทำงานและวันหยุด

- เสาร์อาทิตย์เป็นวันหยุดตายตัว
- Duration นับเป็นวันทำงาน ข้ามเสาร์ อาทิตย์ วันหยุดองค์กร และวันหยุดของโปรเจคนั้น
- วันหยุดไทยดึงจาก `date-holidays` (country `TH`) แล้ว seed ลง DB เป็นรายปี ทุกแถวแก้หรือลบได้
  - ข้อจำกัดที่ตรวจแล้ว (v3.38.0): ตั้งแต่ปี 2027 ไม่มีวันหยุดทางพุทธศาสนา (มาฆบูชา วิสาขบูชา อาสาฬหบูชา เข้าพรรษา) และไม่มีวันหยุดชดเชยเลยทุกปี ต้องเพิ่มเองผ่าน UI
  - Seed ปีปัจจุบันกับปีถัดไปอัตโนมัติตอน container start ถ้าปีนั้นยังไม่มีข้อมูล
- เพิ่มวันหยุดเฉพาะได้ 2 ระดับ: ทั้งองค์กร และรายโปรเจค
- จัดการวันหยุดได้ 2 ทาง
  - Popover บนหัวคอลัมน์วันของ Gantt: ตั้งหรือยกเลิกวันหยุด (องค์กร / โปรเจคนี้)
  - Drawer แสดง calendar รายเดือนจากปุ่มบน toolbar: ดูภาพรวมทั้งปี แก้ไข และ import วันหยุดไทยของปีที่เลือก
- Auto-schedule: เมื่อเลื่อน task ไปข้างหน้าจน successor เริ่มก่อน predecessor จบ ระบบดัน successor (และต่อไปเป็นทอดๆ) ให้เริ่มวันทำงานถัดไป โดยคง duration เป็นวันทำงานเท่าเดิม ตอนเลื่อนถอยหลังไม่ดึง successor ตาม

## 4. UI

- หน้าแรก: รายการโปรเจค สร้าง แก้ชื่อ archive และลบได้ คลิกเพื่อเปิด Gantt
- หน้า Gantt: ตารางด้านซ้าย (ชื่อ, assignee, วันเริ่ม/จบ, progress) กับ timeline ด้านขวา เขียนเองด้วย React, SVG และ Tailwind
  - ลากแถบเพื่อย้ายวัน ลากขอบเพื่อเปลี่ยน duration
  - ลากจุดที่ปลายแถบเพื่อสร้าง dependency แสดงเป็นเส้นลูกศร
  - ลากแถวในตารางเพื่อเรียงลำดับหรือย้าย section
  - Zoom ได้ระดับวัน สัปดาห์ และเดือน
  - ปุ่ม Today และเส้นแสดงวันนี้
  - แรเงาเสาร์อาทิตย์และวันหยุด
  - แถบแสดง progress และ avatar ของ assignee
- หน้าตั้งค่าทีม: สร้าง แก้ และลบทีมพร้อมเลือกสี
- ธีมอิง Instagantt รองรับ light / dark / system
- i18n: อังกฤษ (ค่าเริ่มต้น) และไทย
- ไม่มี real-time: ใช้ optimistic update และ refetch ตอน window focus

## 5. Stack

- Next.js 16 App Router, TypeScript strict, Tailwind CSS, pnpm
- API: REST Route Handlers ใต้ `/api/*` ตรวจ input ด้วย Zod ทุก route ต้อง login
- PostgreSQL + Drizzle ORM (migration เป็นไฟล์ SQL)
- Test: Vitest สำหรับ logic วันทำงานและ scheduling, Playwright สำหรับ e2e
- วันที่เก็บเป็น `DATE` (ไม่มีเวลา) ยึด timezone `Asia/Bangkok`

## 6. Deploy

- `docker-compose.yml` มี `planner-app` และ `planner-postgres` (ใส่ prefix กันชื่อ service ชนกับ stack อื่นบน Dokploy) Keycloak อยู่ภายนอก
- Multi-stage Dockerfile กับ Next.js `output: "standalone"`
- รัน migration ตอน container start
- Deploy บน Dokploy

## 7. นอกขอบเขต v1

- วันลารายบุคคล
- สมาชิกทีม
- Dependency แบบอื่นนอกจาก finish-to-start
- View อื่น (List, Board, Workload)
- Real-time collaboration
- Comment, ไฟล์แนบ, activity log, export
- ตั้งค่าวันทำงานในสัปดาห์
