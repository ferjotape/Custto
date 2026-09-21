import { z } from "zod";

export const comboSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome"),
  items: z
    .array(
      z.object({
        recipe_id: z.string().uuid("Selecione uma receita"),
        quantity: z.number().gt(0, "Deve ser maior que 0"),
      })
    )
    .min(1, "Adicione pelo menos uma receita ao combo"),
});

export type ComboInput = z.infer<typeof comboSchema>;

export const comboPricingSchema = z.object({
  practiced_price: z.number().min(0, "Deve ser >= 0"),
});

export type ComboPricingInput = z.infer<typeof comboPricingSchema>;
