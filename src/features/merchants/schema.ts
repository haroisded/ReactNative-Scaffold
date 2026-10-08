import * as z from 'zod';

// Zod earns its place here because this is *form input* — user-typed, untrusted, and needing
// per-field messages. Reads are not validated with it: the generated database.types.ts already
// expresses the schema, and a Zod mirror of a migration is the migration written twice in two
// languages, drifting from the day it is committed (.claude/instruction_mds/data-layer.md §4).
//
// One schema, shared by the form resolver and the mutation, so the thing validated and the thing
// written cannot disagree.
export const createSystemSchema = z.object({
  // `.trim()` before `.min(1)` so a name of pure spaces fails here rather than at the
  // merchants_name_length check constraint, which bounds the trimmed name at 1..80.
  name: z.string().trim().min(1, 'Enter a system name.').max(80, 'System name is too long.'),
});

export type CreateSystemValues = z.infer<typeof createSystemSchema>;
