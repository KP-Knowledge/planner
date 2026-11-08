import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";
import { addDays, todayInBangkok, type ISODate } from "@/lib/dates";
import { addWorkdays, snapToWorkday } from "@/lib/workdays";
import { createDependency } from "@/server/dependencies";
import { getHolidaySet } from "@/server/holidaySet";
import { createProject } from "@/server/projects";
import { createSection } from "@/server/sections";
import { createTask, updateTask } from "@/server/tasks";
import { createTeam } from "@/server/teams";
import { upsertUserFromProfile } from "@/server/users";

type Spec = {
  key: string;
  name: string;
  start: number;
  days: number;
  progress?: number;
  team?: "design" | "eng";
  assignees?: number[];
  milestone?: boolean;
  subtasks?: Omit<Spec, "subtasks" | "milestone">[];
};

const SECTIONS: { name: string; tasks: Spec[] }[] = [
  {
    name: "Discovery",
    tasks: [
      { key: "kickoff", name: "Kickoff", start: 0, days: 1, milestone: true, progress: 100 },
      {
        key: "research",
        name: "User research",
        start: 1,
        days: 6,
        progress: 100,
        team: "design",
        assignees: [0],
        subtasks: [
          { key: "interviews", name: "Interviews", start: 1, days: 4, progress: 100, assignees: [0] },
          { key: "competitors", name: "Competitor review", start: 4, days: 3, progress: 100, assignees: [1] },
        ],
      },
      { key: "reqs", name: "Requirements doc", start: 7, days: 3, progress: 100, assignees: [1] },
      {
        key: "design",
        name: "Design",
        start: 10,
        days: 8,
        progress: 60,
        team: "design",
        assignees: [0, 1],
        subtasks: [
          { key: "wire", name: "Wireframes", start: 10, days: 3, progress: 100, assignees: [0] },
          { key: "visual", name: "Visual design", start: 13, days: 5, progress: 30, assignees: [0, 1] },
        ],
      },
    ],
  },
  {
    name: "Build",
    tasks: [
      {
        key: "backend",
        name: "Backend API",
        start: 10,
        days: 10,
        progress: 50,
        team: "eng",
        assignees: [2],
        subtasks: [
          { key: "schema", name: "Database schema", start: 10, days: 2, progress: 100, assignees: [2] },
          { key: "endpoints", name: "Endpoints", start: 12, days: 5, progress: 40, assignees: [2, 3] },
          { key: "auth", name: "Auth", start: 17, days: 3, progress: 0, assignees: [3] },
        ],
      },
      {
        key: "frontend",
        name: "Frontend",
        start: 18,
        days: 10,
        progress: 10,
        team: "eng",
        assignees: [3],
        subtasks: [
          { key: "gantt", name: "Gantt view", start: 18, days: 6, progress: 20, assignees: [3] },
          { key: "toolbar", name: "Toolbar and zoom", start: 24, days: 4, progress: 0, assignees: [3, 0, 1, 2] },
        ],
      },
      { key: "integration", name: "Integration", start: 28, days: 4, team: "eng", assignees: [2, 3] },
      { key: "testing", name: "Testing", start: 32, days: 5, team: "eng", assignees: [1] },
    ],
  },
  {
    name: "Launch",
    tasks: [
      { key: "staging", name: "Staging deploy", start: 37, days: 2, team: "eng", assignees: [2] },
      { key: "docs", name: "Documentation", start: 33, days: 6, assignees: [1] },
      { key: "golive", name: "Go live", start: 39, days: 1, milestone: true },
    ],
  },
];

const DEPENDENCIES: [string, string][] = [
  ["kickoff", "research"],
  ["research", "reqs"],
  ["reqs", "design"],
  ["reqs", "backend"],
  ["design", "frontend"],
  ["backend", "integration"],
  ["frontend", "integration"],
  ["integration", "testing"],
  ["testing", "staging"],
  ["staging", "golive"],
  ["docs", "golive"],
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({ connectionString });
  try {
    const db = drizzle(pool, { schema });

    const project = await createProject(db, {
      name: "Demo project",
      description: "Seeded by scripts/seed-demo.ts",
    });
    const holidays = await getHolidaySet(db, project.id);
    const base = snapToWorkday(addDays(todayInBangkok(), -14), holidays);
    const workday = (n: number): ISODate => addWorkdays(base, n, holidays);

    const people: { id: string }[] = [];
    for (const [i, name] of ["Ploy", "Nok", "Arm", "Beam"].entries()) {
      people.push(
        await upsertUserFromProfile(db, {
          sub: `demo-user-${i}`,
          name: `${name} Demo`,
          email: `${name.toLowerCase()}@example.com`,
        }),
      );
    }
    const teams = {
      design: await createTeam(db, { name: "Design", color: "#EC4899" }),
      eng: await createTeam(db, { name: "Engineering", color: "#10B981" }),
    };

    const ids = new Map<string, string>();
    const place = async (
      spec: Omit<Spec, "subtasks">,
      where: { sectionId: string } | { parentId: string },
    ) => {
      const startDate = workday(spec.start);
      const created = await createTask(db, {
        ...where,
        name: spec.name,
        startDate,
        endDate: spec.milestone ? startDate : workday(spec.start + spec.days - 1),
        isMilestone: spec.milestone ?? false,
      });
      ids.set(spec.key, created.id);
      const patch = {
        progress: spec.progress,
        teamId: spec.team ? teams[spec.team].id : undefined,
        assigneeIds: spec.assignees?.map((i) => people[i].id),
      };
      if (patch.progress || patch.teamId || patch.assigneeIds) await updateTask(db, created.id, patch);
      return created.id;
    };

    for (const s of SECTIONS) {
      const section = await createSection(db, { projectId: project.id, name: s.name });
      for (const spec of s.tasks) {
        const parentId = await place(spec, { sectionId: section.id });
        for (const sub of spec.subtasks ?? []) await place(sub, { parentId });
      }
    }

    for (const [from, to] of DEPENDENCIES) {
      await createDependency(db, {
        predecessorId: ids.get(from)!,
        successorId: ids.get(to)!,
      });
    }

    console.log(`seeded project ${project.id} (${ids.size} tasks, ${DEPENDENCIES.length} dependencies)`);
    console.log(`open /projects/${project.id}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
