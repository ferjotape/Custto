-- Remove o sistema de 3 preços (mínimo/recomendado/promocional) do combo.
-- A partir de agora o combo usa um preço único: custo_total_combo × markup
-- ideal (o mesmo markup das receitas individuais) — sem margem de segurança
-- nem desconto promocional próprios de combo. practiced_price é mantido.

alter table combos
  drop column safety_margin_type,
  drop column safety_margin_custom_pct,
  drop column promo_discount_pct;
