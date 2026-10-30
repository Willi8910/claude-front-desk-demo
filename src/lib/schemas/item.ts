import { z } from "zod";

export const itemStatusSchema = z.enum(["planned", "in_progress", "done"]);
const fields = {
  name: z.string().trim().min(1, "Give this item a name.").max(100),
  description: z.string().trim().max(1000),
  status: itemStatusSchema,
};

// Strict objects catch misspelled fields when copying this feature.
export const createItemSchema = z
  .object({
    ...fields,
    description: fields.description.default(""),
    status: fields.status.default("planned"),
  })
  .strict();
export const itemFormSchema = z.object(fields).strict();
export const updateItemSchema = itemFormSchema
  .partial()
  .strict()
  .refine(
    (value) => Object.values(value).some((field) => field !== undefined),
    "Supply at least one field to update.",
  );
export const itemIdSchema = z.uuid();
export type ItemInput = z.infer<typeof itemFormSchema>;
export type ItemPatch = z.infer<typeof updateItemSchema>;
export type Item = ItemInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
