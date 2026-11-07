import { z } from "zod";

function isRealDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === s;
}

export const uuid = z.uuid();
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealDate, "invalid date");
export const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
export const name = z.string().trim().min(1).max(200);
const description = z.string().max(10_000);

export const projectCreate = z.object({
  name,
  description: description.nullish(),
});
export const projectPatch = z.object({
  name: name.optional(),
  description: description.nullable().optional(),
  archived: z.boolean().optional(),
});
export const projectListQuery = z.object({
  archived: z.enum(["true", "false"]).default("false"),
});

export const sectionCreate = z.object({ projectId: uuid, name });
export const sectionPatch = z.object({ name: name.optional() });

export const taskCreate = z
  .object({
    sectionId: uuid.optional(),
    parentId: uuid.optional(),
    name,
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    isMilestone: z.boolean().optional(),
  })
  .refine((v) => v.sectionId !== undefined || v.parentId !== undefined, {
    message: "sectionId or parentId is required",
    path: ["sectionId"],
  });
export const taskPatch = z.object({
  name: name.optional(),
  description: description.nullable().optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  isMilestone: z.boolean().optional(),
  teamId: uuid.nullable().optional(),
  color: hexColor.nullable().optional(),
  assigneeIds: z.array(uuid).max(500).optional(),
});

export const dependencyCreate = z.object({
  predecessorId: uuid,
  successorId: uuid,
});

export const teamCreate = z.object({ name, color: hexColor });
export const teamPatch = z.object({
  name: name.optional(),
  color: hexColor.optional(),
});

export const orderBody = z.object({
  sections: z
    .array(z.object({ id: uuid, taskIds: z.array(uuid) }))
    .max(1000),
});

export type ProjectCreate = z.infer<typeof projectCreate>;
export type ProjectPatch = z.infer<typeof projectPatch>;
export type SectionCreate = z.infer<typeof sectionCreate>;
export type SectionPatch = z.infer<typeof sectionPatch>;
export type TaskCreate = z.infer<typeof taskCreate>;
export type TaskPatch = z.infer<typeof taskPatch>;
export type DependencyCreate = z.infer<typeof dependencyCreate>;
export type TeamCreate = z.infer<typeof teamCreate>;
export type TeamPatch = z.infer<typeof teamPatch>;
export type OrderBody = z.infer<typeof orderBody>;
