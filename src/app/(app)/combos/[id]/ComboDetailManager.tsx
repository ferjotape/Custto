"use client";

import { useMemo, useState, useTransition } from "react";
import { updateComboPricing } from "../actions";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  computeComboPricing,
  computePlatformPrice,
  computePriceMetrics,
  REVENUE_BELOW_FIXED_COSTS_WARNING,
} from "@/lib/pricing";
import type { ComboRecipeLine } from "../comboData";
import type { Combo, CostSettings } from "@/lib/types/database";
import { Card } from "@/components/Card";

type PlatformOption = {
  id: string;
  name: string;
  fee_pct: number;
};

type Props = {
  combo: Combo;
  lines: ComboRecipeLine[];
  totalCost: number;
  summedPrice: number;
  costSettings: CostSettings | null;
  hasIssue: boolean;
  platforms: PlatformOption[];
};

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:focus:border-neutral-100";

export function ComboDetailManager({
  combo,
  lines,
  totalCost,
  summedPrice,
  costSettings,
  hasIssue,
  platforms,
}: Props) {
  const [practicedPrice, setPracticedPrice] = useState(
    combo.practiced_price !== null ? String(combo.practiced_price) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  // Preço sugerido do combo: custo_total_combo × markup ideal — o mesmo
  // markup das receitas individuais e do card "Markup Atual" do Dashboard.
  const pricing = useMemo(
    () => computeComboPricing(totalCost, costSettings),
    [totalCost, costSettings]
  );

  const profitMetrics = useMemo(() => {
    if (pricing.suggestedPrice === null) return null;
    return computePriceMetrics(pricing.suggestedPrice, totalCost, pricing.variablePct);
  }, [pricing.suggestedPrice, totalCost, pricing.variablePct]);

  // Economia percebida: soma dos preços individuais das receitas menos o
  // preço sugerido do combo.
  const economia = pricing.suggestedPrice !== null ? summedPrice - pricing.suggestedPrice : null;

  const platformRows = useMemo(() => {
    if (pricing.suggestedPrice === null) return [];
    return platforms.map((platform) => ({
      platform,
      price: computePlatformPrice(pricing.suggestedPrice as number, platform.fee_pct),
    }));
  }, [platforms, pricing.suggestedPrice]);

  const practicedPriceNum = Number(practicedPrice);
  const practicedPriceValid = practicedPrice.trim() !== "" && !Number.isNaN(practicedPriceNum);

  const save = () => {
    setSaved(false);

    if (!practicedPriceValid || practicedPriceNum < 0) {
      setError("Informe um preço praticado válido.");
      return;
    }

    setError(null);
    startSaving(async () => {
      const result = await updateComboPricing(combo.id, { practiced_price: practicedPriceNum });
      if (!result.success) {
        setError(result.error ?? "Erro ao salvar precificação.");
      } else {
        setSaved(true);
      }
    });
  };

  if (!costSettings) {
    return (
      <div className="flex flex-col gap-3">
        <Card title="Receitas do combo">
          <ComboLinesList lines={lines} summedPrice={summedPrice} />
        </Card>
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Configure seus custos em Configurações de Custos antes de definir o preço deste combo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {hasIssue && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          Alguma receita deste combo tem % de perda inválida e ficou de fora do cálculo — revise
          essa receita para um preço mais preciso.
        </p>
      )}
      {pricing.issue === "revenue_below_fixed_costs" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {REVENUE_BELOW_FIXED_COSTS_WARNING}
        </p>
      )}

      <Card title="Receitas do combo">
        <ComboLinesList lines={lines} summedPrice={summedPrice} />
      </Card>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Custo total do combo" description="Soma do custo com perda de cada receita, pela quantidade no combo.">
          <Stat label="Custo total" value={formatCurrency(totalCost)} highlight />
        </Card>

        <Card title="Preço sugerido" description="Custo total do combo × markup ideal (o mesmo das Configurações de Custos).">
          <Stat
            label="Preço sugerido"
            value={pricing.suggestedPrice !== null ? formatCurrency(pricing.suggestedPrice) : "—"}
            highlight
          />
          {pricing.suggestedPrice === null && pricing.issue !== "revenue_below_fixed_costs" && (
            <p className="text-xs text-neutral-400">
              Preencha o faturamento anual em Configurações de Custos para calcular.
            </p>
          )}
        </Card>
      </div>

      <Card title="Economia percebida e lucro">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Preço somado das receitas" value={formatCurrency(summedPrice)} secondary />
          <Stat
            label="Economia percebida"
            value={economia !== null ? formatCurrency(economia) : "—"}
            highlight
          />
          <Stat
            label="Lucro aproximado"
            value={
              profitMetrics
                ? `${formatCurrency(profitMetrics.profitValue)} (${formatNumber(profitMetrics.profitPct, {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}%)`
                : "—"
            }
          />
        </div>
      </Card>

      <Card title="Preço praticado" description="Preço que você efetivamente cobra pelo combo — editável, guardado só como referência.">
        <div>
          <label className="text-sm font-medium">Preço praticado (R$)</label>
          <input
            value={practicedPrice}
            onChange={(e) => setPracticedPrice(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            className={`${inputClass} mt-1`}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={isSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-active disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar preço praticado"}
          </button>
          {saved && <span className="text-sm text-green-600 dark:text-green-500">Salvo.</span>}
        </div>
      </Card>

      {platforms.length > 0 && (
        <Card title="Preço por plataforma">
          <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
                  <th className="px-3 py-2 font-medium">Plataforma</th>
                  <th className="px-3 py-2 font-medium">Taxa</th>
                  <th className="px-3 py-2 font-medium">Preço</th>
                </tr>
              </thead>
              <tbody>
                {platformRows.map(({ platform, price }) => (
                  <tr key={platform.id} className="border-b border-neutral-200 last:border-b-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">{platform.name}</td>
                    <td className="px-3 py-2 font-mono text-neutral-500">{formatNumber(platform.fee_pct)}%</td>
                    <td className="px-3 py-2 font-mono">{price !== null ? formatCurrency(price) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ComboLinesList({ lines, summedPrice }: { lines: ComboRecipeLine[]; summedPrice: number }) {
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line) => (
        <div
          key={line.id}
          className="flex items-center justify-between gap-3 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          <span>
            {formatNumber(line.quantity)}x {line.recipeName}
          </span>
          <span className="font-mono text-neutral-500">
            {line.suggestedPrice !== null ? formatCurrency(line.suggestedPrice) : "—"}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-neutral-200 pt-2 text-sm dark:border-neutral-800">
        <span className="text-neutral-500">Preço somado</span>
        <span className="font-mono text-neutral-400 line-through">{formatCurrency(summedPrice)}</span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  secondary,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  secondary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={`text-xs uppercase tracking-wide ${secondary ? "text-neutral-400" : "text-neutral-500"}`}>
        {label}
      </span>
      <span
        className={
          highlight
            ? "font-mono text-2xl font-semibold"
            : secondary
              ? "font-mono text-sm text-neutral-500"
              : "font-mono text-lg font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
