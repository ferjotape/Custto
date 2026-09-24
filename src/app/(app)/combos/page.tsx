import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePlan } from "@/lib/subscription";
import { aggregateRecipeCosts, computeRecipePricing } from "@/lib/pricing";
import { ComboManager, type ComboSummary, type RecipeOption } from "./ComboManager";
import { ComboLockScreen } from "./ComboLockScreen";
import { ScreenHeader } from "@/components/ScreenHeader";

export default async function CombosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const plan = await getEffectivePlan(supabase, user.id);

  if (!plan.hasCombos) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 sm:p-6">
        <ScreenHeader
          title="Combos"
          description="Monte combos com várias receitas do seu cardápio."
        />
        <ComboLockScreen />
      </div>
    );
  }

  const [{ data: combos }, { data: recipes }, { data: ingredients }] = await Promise.all([
    supabase
      .from("combos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("recipes")
      .select("id, name, loss_pct")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("ingredients").select("id, unit_cost").eq("user_id", user.id),
  ]);

  const recipeIds = (recipes ?? []).map((r) => r.id);
  const { data: recipeIngredients } =
    recipeIds.length > 0
      ? await supabase
          .from("recipe_ingredients")
          .select("recipe_id, ingredient_id, quantity_used")
          .in("recipe_id", recipeIds)
      : { data: [] };

  const costByRecipe = aggregateRecipeCosts(recipeIngredients ?? [], ingredients ?? []);

  // Custo com perda de cada receita — o mesmo valor exibido na tela de
  // Receitas. Não depende de Configurações de Custos (markup/preço sugerido
  // só entram depois, uma vez só, sobre o custo total do combo já montado).
  const availableRecipes: RecipeOption[] = (recipes ?? []).map((recipe) => {
    const recipeCost = costByRecipe.get(recipe.id)?.totalCost ?? 0;
    const { costWithLoss } = computeRecipePricing({
      recipeCost,
      lossPct: recipe.loss_pct,
      costSettings: null,
    });
    return { id: recipe.id, name: recipe.name, costWithLoss };
  });

  const comboIds = (combos ?? []).map((combo) => combo.id);
  const { data: comboRecipes } =
    comboIds.length > 0
      ? await supabase.from("combo_recipes").select("*").in("combo_id", comboIds)
      : { data: [] };

  const recipeById = new Map(availableRecipes.map((r) => [r.id, r]));

  const summaries: ComboSummary[] = (combos ?? []).map((combo) => ({
    id: combo.id,
    name: combo.name,
    items: (comboRecipes ?? [])
      .filter((item) => item.combo_id === combo.id)
      .map((item) => ({
        id: item.id,
        recipeId: item.recipe_id,
        recipeName: recipeById.get(item.recipe_id)?.name ?? "Receita removida",
        quantity: item.quantity,
      })),
  }));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-4 sm:p-6">
      <ScreenHeader
        title="Combos"
        description="Monte combos com várias receitas do seu cardápio."
      />

      <ComboManager initialCombos={summaries} availableRecipes={availableRecipes} />
    </div>
  );
}
