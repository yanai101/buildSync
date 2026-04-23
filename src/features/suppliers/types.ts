import { z } from "zod";

export const createSupplierSchema = z.object({
	name: z.string().min(2),
	trade: z.string().min(2),
	contactPhone: z.string().optional(),
	contactEmail: z.string().email().optional().or(z.literal("")),
	agreedAmount: z.number().nonnegative().optional(),
	notes: z.string().max(1000).optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
