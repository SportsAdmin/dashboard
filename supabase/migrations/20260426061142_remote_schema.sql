


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_stock_before_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  current_stock int;
begin

  select stock
  into current_stock
  from inventory_items
  where variant_id = new.variant_id;

  if current_stock < new.quantity then
    raise exception 'Stock insuficiente';
  end if;

  return new;

end;
$$;


ALTER FUNCTION "public"."check_stock_before_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_inventory_for_variant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_club_id uuid;
begin

  select club_id into v_club_id
  from products
  where id = new.product_id;

  insert into inventory_items (
    club_id,
    variant_id,
    stock
  )
  values (
    v_club_id,  -- ✅ correcto
    new.id,
    0
  );

  return new;

end;
$$;


ALTER FUNCTION "public"."create_inventory_for_variant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_product"("p_name" "text", "p_category" "text", "p_description" "text", "p_variants" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_product_id uuid;
  v_club_id uuid;
  v_variant jsonb;
begin

  -- obtener club del usuario logueado
  select club_id into v_club_id
  from profiles
  where id = auth.uid();

  -- crear producto
  insert into products (
    name,
    category,
    description,
    club_id
  )
  values (
    p_name,
    p_category,
    p_description,
    v_club_id
  )
  returning id into v_product_id;

  -- crear variantes
  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    insert into product_variants (
      product_id,
      size_id,
      color,
      price,
      price_sale
    )
    values (
      v_product_id,
      (v_variant->>'size_id')::uuid,
      v_variant->>'color',
      (v_variant->>'price')::numeric,
      (v_variant->>'price_sale')::numeric
    );
  end loop;

  return v_product_id;

end;
$$;


ALTER FUNCTION "public"."create_product"("p_name" "text", "p_category" "text", "p_description" "text", "p_variants" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_purchase_order"("p_supplier" "text", "p_expected_date" "date", "p_notes" "text", "p_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_order_id uuid;
  v_club_id uuid;
  v_item jsonb;
begin

  -- obtener club del usuario
  select club_id into v_club_id
  from profiles
  where id = auth.uid();

  -- crear orden
  insert into purchase_orders (
    supplier,
    expected_date,
    notes,
    club_id,
    status
  )
  values (
    p_supplier,
    p_expected_date,
    p_notes,
    v_club_id,
    'pending'
  )
  returning id into v_order_id;

  -- insertar items
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into purchase_order_items (
      purchase_order_id,
      inventory_item_id,
      quantity
    )
    values (
      v_order_id,
      (v_item->>'inventory_item_id')::uuid,
      (v_item->>'quantity')::int
    );
  end loop;

  return v_order_id;

end;
$$;


ALTER FUNCTION "public"."create_purchase_order"("p_supplier" "text", "p_expected_date" "date", "p_notes" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_return"("p_sale_id" "uuid", "p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reason" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_return_id uuid;
begin


insert into returns (
  sale_id,
  club_id,
  reason
)
values (
  p_sale_id,
  p_club_id,
  p_reason
)
returning id into v_return_id;


insert into return_items (
  return_id,
  variant_id,
  quantity,
  condition
)
values (
  v_return_id,
  p_variant_id,
  p_quantity,
  'new'
);


update inventory_items
set stock = stock + p_quantity
where club_id = p_club_id
and variant_id = p_variant_id;


insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  p_variant_id,
  p_quantity,
  'return',
  v_return_id
);

return v_return_id;

end;
$$;


ALTER FUNCTION "public"."create_return"("p_sale_id" "uuid", "p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_sale"("p_club_id" "uuid", "p_seller_id" "uuid", "p_customer_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_payment jsonb;
begin


for v_item in select * from jsonb_array_elements(p_items)
loop
  v_total := v_total +
    ((v_item->>'price')::numeric *
     (v_item->>'quantity')::int);
end loop;


insert into sales (
  club_id,
  seller_id,
  customer_id,
  total
)
values (
  p_club_id,
  p_seller_id,
  p_customer_id,
  v_total
)
returning id into v_sale_id;


for v_item in select * from jsonb_array_elements(p_items)
loop

insert into sale_items (
  sale_id,
  variant_id,
  quantity,
  price
)
values (
  v_sale_id,
  (v_item->>'variant_id')::uuid,
  (v_item->>'quantity')::int,
  (v_item->>'price')::numeric
);


update inventory_items
set stock = stock - (v_item->>'quantity')::int
where variant_id = (v_item->>'variant_id')::uuid
and club_id = p_club_id;


insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  (v_item->>'variant_id')::uuid,
  -(v_item->>'quantity')::int,
  'sale',
  v_sale_id
);

end loop;


for v_payment in select * from jsonb_array_elements(p_payments)
loop

insert into payments (
  sale_id,
  club_id,
  method,
  amount
)
values (
  v_sale_id,
  p_club_id,
  (v_payment->>'method'),
  (v_payment->>'amount')::numeric
);

end loop;

return v_sale_id;

end;
$$;


ALTER FUNCTION "public"."create_sale"("p_club_id" "uuid", "p_seller_id" "uuid", "p_customer_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_stock_movement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  insert into stock_movements(
    club_id,
    variant_id,
    type,
    quantity,
    reference_id
  )
  select
    s.club_id,
    new.variant_id,
    'sale',
    new.quantity,
    new.sale_id
  from sales s
  where s.id = new.sale_id;

  return new;

end;
$$;


ALTER FUNCTION "public"."create_stock_movement"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_club_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_club_id UUID;
BEGIN
  SELECT club_id INTO user_club_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_club_id;
END;
$$;


ALTER FUNCTION "public"."get_current_user_club_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = auth.uid();

  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_profile"() RETURNS TABLE("role" "text", "club_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select role, club_id
  from profiles
  where id = auth.uid()
$$;


ALTER FUNCTION "public"."get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_club"() RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select club_id
  from profiles
  where id = auth.uid()
$$;


ALTER FUNCTION "public"."get_user_club"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_purchase_order_delivered"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin

  -- SOLO cuando cambia a delivered
  if new.status = 'delivered' and old.status is distinct from 'delivered' then

    -- actualizar stock
    update inventory_items ii
    set stock = ii.stock + poi.quantity
    from purchase_order_items poi
    where poi.purchase_order_id = new.id
      and poi.inventory_item_id = ii.id;

    -- crear movimientos
    insert into stock_movements (
      club_id,
      variant_id,
      type,
      quantity,
      reference_id
    )
    select
      ii.club_id,
      ii.variant_id,
      'restock',
      poi.quantity,
      new.id
    from purchase_order_items poi
    join inventory_items ii on ii.id = poi.inventory_item_id
    where poi.purchase_order_id = new.id;

  end if;

  return new;

end;
$$;


ALTER FUNCTION "public"."handle_purchase_order_delivered"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_restock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  -- aumentar stock
  update inventory_items
  set stock = stock + new.quantity
  where id = new.inventory_item_id;

  -- registrar movimiento
  insert into stock_movements (
    club_id,
    inventory_item_id,
    type,
    quantity,
    reference_id
  )
  select
    club_id,
    new.inventory_item_id,
    'restock',
    new.quantity,
    new.purchase_order_id
  from inventory_items
  where id = new.inventory_item_id;

  return new;

end;
$$;


ALTER FUNCTION "public"."handle_restock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_sale_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  -- descontar stock
  update inventory_items
  set stock = stock - new.quantity
  where id = new.inventory_item_id;

  -- registrar movimiento
  insert into stock_movements (
    club_id,
    inventory_item_id,
    type,
    quantity,
    reference_id
  )
  select
    club_id,
    new.inventory_item_id,
    'sale',
    new.quantity,
    new.sale_id
  from inventory_items
  where id = new.inventory_item_id;

  return new;

end;
$$;


ALTER FUNCTION "public"."handle_sale_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_negative_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  if (select stock from inventory_items where id = new.inventory_item_id) < new.quantity then
    raise exception 'Stock insuficiente';
  end if;

  return new;

end;
$$;


ALTER FUNCTION "public"."prevent_negative_stock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reduce_stock_after_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin

  update inventory_items
  set stock = stock - new.quantity
  where variant_id = new.variant_id;

  return new;

end;
$$;


ALTER FUNCTION "public"."reduce_stock_after_sale"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restock_inventory"("p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reference_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin


update inventory_items
set stock = stock + p_quantity
where club_id = p_club_id
and variant_id = p_variant_id;


insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  p_variant_id,
  p_quantity,
  'restock',
  p_reference_id
);

end;
$$;


ALTER FUNCTION "public"."restock_inventory"("p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reference_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."cash_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "cash_register_id" "uuid",
    "club_id" "uuid",
    "type" "text",
    "amount" numeric NOT NULL,
    "reference_id" "uuid",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "cash_movements_type_check" CHECK (("type" = ANY (ARRAY['sale'::"text", 'withdrawal'::"text", 'deposit'::"text", 'adjustment'::"text"])))
);


ALTER TABLE "public"."cash_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cash_registers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "opened_by" "uuid",
    "closed_by" "uuid",
    "opened_at" timestamp without time zone DEFAULT "now"(),
    "closed_at" timestamp without time zone,
    "opening_amount" numeric DEFAULT 0,
    "closing_amount" numeric,
    "status" "text" DEFAULT 'open'::"text",
    CONSTRAINT "cash_registers_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."cash_registers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_clubs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "customer_id" "uuid",
    "club_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "document_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."club_customers" AS
 SELECT "customers"."id",
    "customers"."name",
    "customers"."phone",
    "customer_clubs"."club_id"
   FROM ("public"."customers"
     JOIN "public"."customer_clubs" ON (("customers"."id" = "customer_clubs"."customer_id")));


ALTER VIEW "public"."club_customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "city" "text",
    "logo_url" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "seller_id" "uuid",
    "total" numeric(10,2),
    "payment_method" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "customer_id" "uuid",
    CONSTRAINT "sales_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'transfer'::"text", 'card'::"text", 'mercadopago'::"text"])))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."daily_sales" AS
 SELECT "club_id",
    "date"("created_at") AS "date",
    "sum"("total") AS "total_sales",
    "count"("id") AS "sales_count"
   FROM "public"."sales"
  GROUP BY "club_id", ("date"("created_at"));


ALTER VIEW "public"."daily_sales" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "stock" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "variant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "size_id" "uuid",
    "color" "text",
    "sku" "text",
    "price" numeric(10,2),
    "created_at" timestamp without time zone DEFAULT "now"(),
    "price_sale" numeric
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "description" "text",
    "active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sizes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "order_index" integer
);


ALTER TABLE "public"."sizes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."inventory_view" AS
 SELECT "ii"."id",
    "ii"."club_id",
    "p"."name" AS "product",
    "s"."name" AS "size",
    "pv"."color",
    "ii"."stock"
   FROM ((("public"."inventory_items" "ii"
     JOIN "public"."product_variants" "pv" ON (("ii"."variant_id" = "pv"."id")))
     JOIN "public"."products" "p" ON (("pv"."product_id" = "p"."id")))
     LEFT JOIN "public"."sizes" "s" ON (("pv"."size_id" = "s"."id")));


ALTER VIEW "public"."inventory_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid",
    "club_id" "uuid",
    "method" "text",
    "amount" numeric NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "payments_method_check" CHECK (("method" = ANY (ARRAY['cash'::"text", 'transfer'::"text", 'card'::"text", 'mercadopago'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "club_id" "uuid",
    "name" "text",
    "role" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text", 'warehouse'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "purchase_order_id" "uuid",
    "inventory_item_id" "uuid",
    "quantity" integer
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "supplier" "text",
    "status" "text",
    "expected_date" "date",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "purchase_orders_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'in_production'::"text", 'shipped'::"text", 'delivered'::"text"])))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "return_id" "uuid",
    "variant_id" "uuid",
    "quantity" integer NOT NULL,
    "condition" "text",
    CONSTRAINT "return_items_condition_check" CHECK (("condition" = ANY (ARRAY['new'::"text", 'used'::"text", 'damaged'::"text"])))
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid",
    "club_id" "uuid",
    "customer_id" "uuid",
    "reason" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sale_id" "uuid",
    "quantity" integer,
    "price" numeric(10,2),
    "variant_id" "uuid" NOT NULL
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "club_id" "uuid",
    "type" "text",
    "quantity" integer,
    "reference_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "variant_id" "uuid" NOT NULL,
    "inventory_item_id" "uuid",
    CONSTRAINT "stock_movements_type_check" CHECK (("type" = ANY (ARRAY['sale'::"text", 'restock'::"text", 'adjustment'::"text", 'return'::"text"])))
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."v_club_id" (
    "club_id" "uuid"
);


ALTER TABLE "public"."v_club_id" OWNER TO "postgres";


ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_clubs"
    ADD CONSTRAINT "customer_clubs_customer_id_club_id_key" UNIQUE ("customer_id", "club_id");



ALTER TABLE ONLY "public"."customer_clubs"
    ADD CONSTRAINT "customer_clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sizes"
    ADD CONSTRAINT "sizes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "unique_club_variant" UNIQUE ("club_id", "variant_id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "unique_variant" UNIQUE ("product_id", "size_id", "color");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "unique_variant_per_club" UNIQUE ("club_id", "variant_id");



CREATE INDEX "idx_club_customers" ON "public"."customer_clubs" USING "btree" ("club_id");



CREATE INDEX "idx_customer_clubs" ON "public"."customer_clubs" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_customer_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_inventory_club" ON "public"."inventory_items" USING "btree" ("club_id");



CREATE INDEX "idx_inventory_variant" ON "public"."inventory_items" USING "btree" ("variant_id");



CREATE INDEX "idx_payments_club" ON "public"."payments" USING "btree" ("club_id");



CREATE INDEX "idx_payments_sale" ON "public"."payments" USING "btree" ("sale_id");



CREATE INDEX "idx_sales_club" ON "public"."sales" USING "btree" ("club_id");



CREATE INDEX "idx_sales_date" ON "public"."sales" USING "btree" ("created_at");



CREATE INDEX "idx_stock_movements_variant" ON "public"."stock_movements" USING "btree" ("variant_id");



CREATE INDEX "idx_stock_variant" ON "public"."stock_movements" USING "btree" ("variant_id");



CREATE OR REPLACE TRIGGER "on_purchase_order_updated" AFTER UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."handle_purchase_order_delivered"();



CREATE OR REPLACE TRIGGER "on_variant_created" AFTER INSERT ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."create_inventory_for_variant"();



CREATE OR REPLACE TRIGGER "register_stock_movement" AFTER INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."create_stock_movement"();



CREATE OR REPLACE TRIGGER "sale_stock_trigger" AFTER INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."handle_sale_stock"();



CREATE OR REPLACE TRIGGER "update_stock_after_sale" AFTER INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."reduce_stock_after_sale"();



CREATE OR REPLACE TRIGGER "validate_stock" BEFORE INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."check_stock_before_sale"();



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id");



ALTER TABLE ONLY "public"."cash_movements"
    ADD CONSTRAINT "cash_movements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customer_clubs"
    ADD CONSTRAINT "customer_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_clubs"
    ADD CONSTRAINT "customer_clubs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "public"."sizes"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



CREATE POLICY "Super admin can see all products" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Users can insert products" ON "public"."products" FOR INSERT WITH CHECK (("club_id" = ( SELECT "profiles"."club_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their club products" ON "public"."products" FOR SELECT USING (("club_id" = "public"."get_user_club"()));



CREATE POLICY "Users create sales for their club" ON "public"."sales" FOR INSERT WITH CHECK (("club_id" = "public"."get_user_club"()));



CREATE POLICY "Users see inventory of their club" ON "public"."inventory_items" FOR SELECT USING (("club_id" = "public"."get_user_club"()));



CREATE POLICY "Users see their club sales" ON "public"."sales" FOR SELECT USING (("club_id" = "public"."get_user_club"()));



CREATE POLICY "inventory insert" ON "public"."inventory_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])) AND ("p"."club_id" = "inventory_items"."club_id")))));



CREATE POLICY "inventory select" ON "public"."inventory_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "inventory_items"."club_id")))));



CREATE POLICY "inventory update" ON "public"."inventory_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])) AND ("p"."club_id" = "inventory_items"."club_id")))));



ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "po insert" ON "public"."purchase_orders" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text"])) AND ("p"."club_id" = "purchase_orders"."club_id")))));



CREATE POLICY "po items insert" ON "public"."purchase_order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true))
  WHERE (("po"."id" = "purchase_order_items"."purchase_order_id") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text"])) AND ("p"."club_id" = "po"."club_id")))));



CREATE POLICY "po items select" ON "public"."purchase_order_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."purchase_orders" "po"
     JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true))
  WHERE (("po"."id" = "purchase_order_items"."purchase_order_id") AND (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "po"."club_id"))))));



CREATE POLICY "po select" ON "public"."purchase_orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "purchase_orders"."club_id")))));



CREATE POLICY "po update" ON "public"."purchase_orders" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR (("p"."role" = 'manager'::"text") AND ("p"."club_id" = "purchase_orders"."club_id") AND ("purchase_orders"."status" = 'pending'::"text"))))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products delete" ON "public"."products" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE ("p"."role" = 'admin'::"text"))));



CREATE POLICY "products insert" ON "public"."products" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])) AND ("p"."club_id" = "products"."club_id")))));



CREATE POLICY "products select" ON "public"."products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "products"."club_id")))));



CREATE POLICY "products update" ON "public"."products" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text"])) AND ("p"."club_id" = "products"."club_id")))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_policy" ON "public"."profiles" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "profiles_insert_policy" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_policy" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR ("public"."get_current_user_role"() = 'admin'::"text") OR (("public"."get_current_user_role"() = 'manager'::"text") AND ("public"."get_current_user_club_id"() IS NOT NULL) AND ("club_id" = "public"."get_current_user_club_id"()))));



CREATE POLICY "profiles_update_policy" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "read inventory_items" ON "public"."inventory_items" FOR SELECT USING (("club_id" = ( SELECT "profiles"."club_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "read purchase_order_items" ON "public"."purchase_order_items" FOR SELECT USING (("purchase_order_id" IN ( SELECT "purchase_orders"."id"
   FROM "public"."purchase_orders"
  WHERE ("purchase_orders"."club_id" = ( SELECT "profiles"."club_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "read purchase_orders" ON "public"."purchase_orders" FOR SELECT USING (("club_id" = ( SELECT "profiles"."club_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "sale items insert" ON "public"."sale_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."sales" "s"
     JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true))
  WHERE (("s"."id" = "sale_items"."sale_id") AND ("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text"])) AND ("p"."club_id" = "s"."club_id")))));



CREATE POLICY "sale items select" ON "public"."sale_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."sales" "s"
     JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true))
  WHERE (("s"."id" = "sale_items"."sale_id") AND (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "s"."club_id"))))));



ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales insert" ON "public"."sales" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text"])) AND ("p"."club_id" = "sales"."club_id")))));



CREATE POLICY "sales select" ON "public"."sales" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "sales"."club_id")))));



CREATE POLICY "stock movements insert" ON "public"."stock_movements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = ANY (ARRAY['admin'::"text", 'manager'::"text", 'seller'::"text"])) AND ("p"."club_id" = "stock_movements"."club_id")))));



CREATE POLICY "stock movements select" ON "public"."stock_movements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."get_my_profile"() "p"("role", "club_id")
  WHERE (("p"."role" = 'admin'::"text") OR ("p"."club_id" = "stock_movements"."club_id")))));



ALTER TABLE "public"."stock_movements" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_stock_before_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_stock_before_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_stock_before_sale"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_inventory_for_variant"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_inventory_for_variant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_inventory_for_variant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_category" "text", "p_description" "text", "p_variants" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_category" "text", "p_description" "text", "p_variants" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_product"("p_name" "text", "p_category" "text", "p_description" "text", "p_variants" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_purchase_order"("p_supplier" "text", "p_expected_date" "date", "p_notes" "text", "p_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_purchase_order"("p_supplier" "text", "p_expected_date" "date", "p_notes" "text", "p_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_purchase_order"("p_supplier" "text", "p_expected_date" "date", "p_notes" "text", "p_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_return"("p_sale_id" "uuid", "p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_return"("p_sale_id" "uuid", "p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_return"("p_sale_id" "uuid", "p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_sale"("p_club_id" "uuid", "p_seller_id" "uuid", "p_customer_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_sale"("p_club_id" "uuid", "p_seller_id" "uuid", "p_customer_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_sale"("p_club_id" "uuid", "p_seller_id" "uuid", "p_customer_id" "uuid", "p_items" "jsonb", "p_payments" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_stock_movement"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_stock_movement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_stock_movement"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_club_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_club_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_club_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_profile"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_club"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_club"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_club"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_purchase_order_delivered"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_purchase_order_delivered"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_purchase_order_delivered"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_restock"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_restock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_restock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_sale_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_sale_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_sale_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_negative_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_negative_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_negative_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reduce_stock_after_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."reduce_stock_after_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reduce_stock_after_sale"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restock_inventory"("p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restock_inventory"("p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restock_inventory"("p_club_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_reference_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."cash_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_movements" TO "service_role";



GRANT ALL ON TABLE "public"."cash_registers" TO "anon";
GRANT ALL ON TABLE "public"."cash_registers" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_registers" TO "service_role";



GRANT ALL ON TABLE "public"."customer_clubs" TO "anon";
GRANT ALL ON TABLE "public"."customer_clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_clubs" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."club_customers" TO "anon";
GRANT ALL ON TABLE "public"."club_customers" TO "authenticated";
GRANT ALL ON TABLE "public"."club_customers" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."daily_sales" TO "anon";
GRANT ALL ON TABLE "public"."daily_sales" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_sales" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."sizes" TO "anon";
GRANT ALL ON TABLE "public"."sizes" TO "authenticated";
GRANT ALL ON TABLE "public"."sizes" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_view" TO "anon";
GRANT ALL ON TABLE "public"."inventory_view" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_view" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."v_club_id" TO "anon";
GRANT ALL ON TABLE "public"."v_club_id" TO "authenticated";
GRANT ALL ON TABLE "public"."v_club_id" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_return(p_sale_id uuid, p_club_id uuid, p_variant_id uuid, p_quantity integer, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_return_id uuid;
begin

-- crear devolución

insert into returns (
  sale_id,
  club_id,
  reason
)
values (
  p_sale_id,
  p_club_id,
  p_reason
)
returning id into v_return_id;

-- crear item devuelto

insert into return_items (
  return_id,
  variant_id,
  quantity,
  condition
)
values (
  v_return_id,
  p_variant_id,
  p_quantity,
  'new'
);

-- devolver stock

update inventory_items
set stock = stock + p_quantity
where club_id = p_club_id
and variant_id = p_variant_id;

-- registrar movimiento

insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  p_variant_id,
  p_quantity,
  'return',
  v_return_id
);

return v_return_id;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_sale(p_club_id uuid, p_seller_id uuid, p_customer_id uuid, p_items jsonb, p_payments jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
declare
  v_sale_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_payment jsonb;
begin

-- calcular total

for v_item in select * from jsonb_array_elements(p_items)
loop
  v_total := v_total +
    ((v_item->>'price')::numeric *
     (v_item->>'quantity')::int);
end loop;

-- crear venta

insert into sales (
  club_id,
  seller_id,
  customer_id,
  total
)
values (
  p_club_id,
  p_seller_id,
  p_customer_id,
  v_total
)
returning id into v_sale_id;

-- crear items

for v_item in select * from jsonb_array_elements(p_items)
loop

insert into sale_items (
  sale_id,
  variant_id,
  quantity,
  price
)
values (
  v_sale_id,
  (v_item->>'variant_id')::uuid,
  (v_item->>'quantity')::int,
  (v_item->>'price')::numeric
);

-- descontar stock

update inventory_items
set stock = stock - (v_item->>'quantity')::int
where variant_id = (v_item->>'variant_id')::uuid
and club_id = p_club_id;

-- registrar movimiento stock

insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  (v_item->>'variant_id')::uuid,
  -(v_item->>'quantity')::int,
  'sale',
  v_sale_id
);

end loop;

-- registrar pagos

for v_payment in select * from jsonb_array_elements(p_payments)
loop

insert into payments (
  sale_id,
  club_id,
  method,
  amount
)
values (
  v_sale_id,
  p_club_id,
  (v_payment->>'method'),
  (v_payment->>'amount')::numeric
);

end loop;

return v_sale_id;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.restock_inventory(p_club_id uuid, p_variant_id uuid, p_quantity integer, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin

-- aumentar stock

update inventory_items
set stock = stock + p_quantity
where club_id = p_club_id
and variant_id = p_variant_id;

-- registrar movimiento

insert into stock_movements (
  club_id,
  variant_id,
  quantity,
  type,
  reference_id
)
values (
  p_club_id,
  p_variant_id,
  p_quantity,
  'restock',
  p_reference_id
);

end;
$function$
;


