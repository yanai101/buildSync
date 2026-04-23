import { z } from "zod";

export const createExpenseSchema = z.object({
	categoryId: z.string().min(1),
	amount: z.number().positive(),
	expenseDate: z.string().min(1),
	supplierId: z.string().optional(),
	note: z.string().max(1000).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
