"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { createCombo, deleteCombo } from "./actions";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Card } from "@/components/Card";

export type RecipeOption = {
  id: string;
  name: string;
  /** Custo com perda da receita — nunca o preço sugerido. Null quando a % de perda é inválida (>= 100%). */
  costWithLoss: number | null;
};

export type ComboItemSummary = {
  id: string;
  recipeId: string;
  recipeName: string;
  quantity: number;
};

export type ComboSummary = {
  id: string;
  name: string;
  items: ComboItemSummary[];
};

type DraftItem = {
  recipeId: string;
  quantity: number;
};

type Props = {
  initialCombos: ComboSummary[];
  availableRecipes: RecipeOption[];
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100";

export function ComboManager({ initialCombos, availableRecipes }: Props) {
  const router = useRouter();
  const [combos, setCombos] = useState<ComboSummary[]>(initialCombos);
  const [name, setName] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [recipeId, setRecipeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [pickerKey, setPickerKey] = useState(0);

  const recipesMap = useMemo(
    () => new Map(availableRecipes.map((r) => [r.id, r])),
    [availableRecipes]
  );

  // Custo Total do Combo: soma de (custo_com_perda × quantidade) de cada
  // linha — SEMPRE recalculado a partir do custo_com_perda de cada receita,
  // nunca do preço sugerido. Atualiza em tempo real a cada mudança de
  // quantidade ou item, antes de qualquer markup.
  const custoTotalCombo = useMemo(
    () =>
      draftItems.reduce((sum, item) => {
        const cost = recipesMap.get(item.recipeId)?.costWithLoss ?? 0;
        return sum + cost * item.quantity;
      }, 0),
    [draftItems, recipesMap]
  );

  const addItem = () => {
    const recipe = recipesMap.get(recipeId);
    if (!recipe) {
      setError("Selecione uma receita.");
      return;
    }
    setError(null);
    setDraftItems((prev) => [...prev, { recipeId: recipe.id, quantity: 1 }]);
    setRecipeId("");
    setPickerKey((k) => k + 1);
  };

  const updateQuantity = (index: number, raw: string) => {
    const qty = Number(raw);
    setDraftItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Number.isNaN(qty) ? 0 : qty } : item))
    );
  };

  const removeDraftItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const saveCombo = () => {
    if (!name.trim()) {
      setError("Informe o nome do combo.");
      return;
    }
    if (draftItems.length === 0) {
      setError("Adicione pelo menos uma receita ao combo.");
      return;
    }
    if (draftItems.some((item) => !(item.quantity > 0))) {
      setError("A quantidade de cada item precisa ser maior que zero.");
      return;
    }
    setError(null);
    startSaving(async () => {
      const result = await createCombo({
        name: name.trim(),
        items: draftItems.map((item) => ({ recipe_id: item.recipeId, quantity: item.quantity })),
      });
      if (result.success && result.combo) {
        router.push(`/combos/${result.combo.id}`);
      } else {
        setError(result.error ?? "Erro ao criar combo.");
      }
    });
  };

  const removeCombo = (combo: ComboSummary) => {
    if (!window.confirm(`Remover o combo "${combo.name}"?`)) {
      return;
    }
    setPendingRemoveId(combo.id);
    startSaving(async () => {
      const result = await deleteCombo(combo.id);
      setPendingRemoveId(null);
      if (result.success) {
        setCombos((prev) => prev.filter((c) => c.id !== combo.id));
      } else {
        setError(result.error ?? "Erro ao remover combo.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 gap-3">
        <Card
          title="Novo combo"
          description="Dê um nome ao combo e adicione as receitas que fazem parte dele."
        >
          <div>
            <label className="text-sm font-medium">Nome do combo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Combo Casal"
              className={`${inputClass} mt-1`}
            />
          </div>

          {availableRecipes.length === 0 ? (
            <p className="text-sm text-neutral-400">
              Você ainda não tem receitas cadastradas. Cadastre em &quot;Receitas&quot; antes de
              montar combos.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1">
                <RecipePicker
                  key={pickerKey}
                  recipes={availableRecipes}
                  value={recipeId}
                  onChange={setRecipeId}
                />
              </div>
              <button
                type="button"
                onClick={addItem}
                className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                Adicionar item
              </button>
            </div>
          )}

          {draftItems.length > 0 && (
            <div className="flex flex-col gap-2">
              {draftItems.map((item, index) => {
                const recipe = recipesMap.get(item.recipeId);
                return (
                  <div
                    key={`${item.recipeId}-${index}`}
                    className="grid grid-cols-[1fr_7rem_5rem_2.25rem] items-center gap-2 rounded-md border border-neutral-300 p-2 dark:border-neutral-700"
                  >
                    <span className="truncate text-sm">{recipe?.name ?? "Receita removida"}</span>
                    <span className="text-right text-xs text-neutral-500">
                      Custo:{" "}
                      <span className="font-mono">
                        {recipe?.costWithLoss !== null && recipe?.costWithLoss !== undefined
                          ? formatCurrency(recipe.costWithLoss)
                          : "—"}
                      </span>
                    </span>
                    <input
                      value={item.quantity}
                      onChange={(e) => updateQuantity(index, e.target.value)}
                      type="number"
                      step="1"
                      min="1"
                      aria-label={`Quantidade de ${recipe?.name ?? "item"}`}
                      className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-right text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftItem(index)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-300 text-neutral-500 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
                      aria-label="Remover item"
                    >
                      ×
                    </button>
                  </div>
                );
              })}

              <div className="flex items-center justify-between rounded-md border border-accent/40 bg-accent/5 px-3 py-2">
                <span className="text-sm font-medium">Custo Total do Combo</span>
                <span className="font-mono text-base font-semibold">
                  {formatCurrency(custoTotalCombo)}
                </span>
              </div>
              <p className="px-1 text-xs text-neutral-400">
                Soma do custo com perda de cada item pela quantidade — sem nenhum markup ainda. O
                preço sugerido é calculado na tela do combo depois de salvar.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveCombo}
              disabled={isSaving}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-active disabled:opacity-60"
            >
              {isSaving ? "Salvando..." : "Salvar combo"}
            </button>
          </div>
        </Card>

        <Card title="Meus combos">
          {combos.length === 0 && (
            <p className="text-sm text-neutral-400">Nenhum combo cadastrado ainda.</p>
          )}

          {combos.map((combo) => (
            <div
              key={combo.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-neutral-300 p-3 dark:border-neutral-700"
            >
              <div>
                <p className="text-sm font-medium">{combo.name}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {combo.items.map((item) => `${formatNumber(item.quantity)}x ${item.recipeName}`).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/combos/${combo.id}`}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  Abrir
                </Link>
                <button
                  type="button"
                  onClick={() => removeCombo(combo)}
                  disabled={isSaving && pendingRemoveId === combo.id}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
                >
                  {isSaving && pendingRemoveId === combo.id ? "Removendo..." : "Remover"}
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function RecipePicker({
  recipes,
  value,
  onChange,
}: {
  recipes: RecipeOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = recipes.find((r) => r.id === value);
  const [query, setQuery] = useState(selected?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? recipes.filter((r) => r.name.toLowerCase().includes(q)) : recipes;
    return list.slice(0, 8);
  }, [recipes, query]);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          onChange("");
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Buscar receita pelo nome..."
        className={inputClass}
      />
      {isOpen && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-neutral-300 bg-white text-sm shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          {matches.map((recipe) => (
            <li key={recipe.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(recipe.id);
                  setQuery(recipe.name);
                  setIsOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span>{recipe.name}</span>
                <span className="shrink-0 font-mono text-xs text-neutral-400">
                  {recipe.costWithLoss !== null ? formatCurrency(recipe.costWithLoss) : "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
