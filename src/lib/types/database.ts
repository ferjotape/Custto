export type FixedCost = {
  name: string;
  value: number;
};

export type Profile = {
  id: string;
  restaurant_name: string | null;
  email: string | null;
  is_admin: boolean;
  created_at: string;
  terms_accepted_at: string | null;
};

export type CostSettings = {
  id: string;
  user_id: string;
  fixed_costs: FixedCost[];
  card_fee_pct: number;
  packaging_pct: number;
  free_delivery_pct: number;
  desired_profit_pct: number;
  avg_monthly_revenue: number | null;
  updated_at: string;
};

export type DeliveryPlatform = {
  id: string;
  user_id: string;
  name: string;
  fee_pct: number;
  is_active: boolean;
};

export type Ingredient = {
  id: string;
  user_id: string;
  code: number | null;
  name: string;
  price_paid: number;
  purchase_volume: number;
  unit: string;
  correction_factor: number;
  unit_cost: number;
  created_at: string;
};

export type Recipe = {
  id: string;
  user_id: string;
  name: string;
  loss_pct: number;
  discount_pct: number;
  practiced_price: number | null;
  created_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity_used: number;
};

export type RecipePlatformPrice = {
  id: string;
  recipe_id: string;
  platform_id: string;
  suggested_price: number | null;
  price_with_discount: number | null;
  profit_pct: number | null;
  profit_value: number | null;
  cmv_pct: number | null;
  calculated_at: string;
};

export type MonthlyRevenue = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  value: number;
  updated_at: string;
};

export type DeliveryCostSettings = {
  id: string;
  user_id: string;
  /** Valor único, atualizado manualmente pelo usuário — não vinculado a um mês específico. */
  monthly_orders: number;
  delivery_value: number;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: string;
  plan_id: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  name: string;
  price_cents: number;
  recipe_limit: number | null;
  has_combos: boolean;
  stripe_price_id: string | null;
  display_order: number;
  created_at: string;
};

export type Combo = {
  id: string;
  user_id: string;
  name: string;
  discount_pct: number;
  practiced_price: number | null;
  created_at: string;
};

export type ComboRecipe = {
  id: string;
  combo_id: string;
  recipe_id: string;
  quantity: number;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      cost_settings: {
        Row: CostSettings;
        Insert: Partial<CostSettings> & { user_id: string };
        Update: Partial<CostSettings>;
        Relationships: [];
      };
      delivery_platforms: {
        Row: DeliveryPlatform;
        Insert: Partial<DeliveryPlatform> & { user_id: string; name: string; fee_pct: number };
        Update: Partial<DeliveryPlatform>;
        Relationships: [];
      };
      ingredients: {
        Row: Ingredient;
        // unit_cost é gerado pelo Postgres (generated always as stored) e não pode ser definido pela aplicação
        Insert: Omit<Partial<Ingredient>, "unit_cost"> & {
          user_id: string;
          name: string;
          price_paid: number;
          purchase_volume: number;
          unit: string;
        };
        Update: Omit<Partial<Ingredient>, "unit_cost">;
        Relationships: [];
      };
      recipes: {
        Row: Recipe;
        Insert: Partial<Recipe> & { user_id: string; name: string };
        Update: Partial<Recipe>;
        Relationships: [];
      };
      recipe_ingredients: {
        Row: RecipeIngredient;
        Insert: Partial<RecipeIngredient> & {
          recipe_id: string;
          ingredient_id: string;
          quantity_used: number;
        };
        Update: Partial<RecipeIngredient>;
        Relationships: [];
      };
      recipe_platform_prices: {
        Row: RecipePlatformPrice;
        Insert: Partial<RecipePlatformPrice> & { recipe_id: string; platform_id: string };
        Update: Partial<RecipePlatformPrice>;
        Relationships: [];
      };
      subscriptions: {
        Row: Subscription;
        Insert: Partial<Subscription> & { user_id: string };
        Update: Partial<Subscription>;
        Relationships: [];
      };
      plans: {
        Row: Plan;
        Insert: Partial<Plan> & { id: string; name: string; price_cents: number; display_order: number };
        Update: Partial<Plan>;
        Relationships: [];
      };
      monthly_revenue: {
        Row: MonthlyRevenue;
        Insert: Partial<MonthlyRevenue> & { user_id: string; year: number; month: number; value: number };
        Update: Partial<MonthlyRevenue>;
        Relationships: [];
      };
      delivery_cost_settings: {
        Row: DeliveryCostSettings;
        Insert: Partial<DeliveryCostSettings> & { user_id: string };
        Update: Partial<DeliveryCostSettings>;
        Relationships: [];
      };
      combos: {
        Row: Combo;
        Insert: Partial<Combo> & { user_id: string; name: string };
        Update: Partial<Combo>;
        Relationships: [];
      };
      combo_recipes: {
        Row: ComboRecipe;
        Insert: Partial<ComboRecipe> & { combo_id: string; recipe_id: string; quantity: number };
        Update: Partial<ComboRecipe>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
