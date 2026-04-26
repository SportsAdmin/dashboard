-- Add user_id column to stock_movements table
-- This allows tracking WHO made each stock movement (sales, restocks, adjustments, returns)

-- Step 1: Add the column (nullable initially for existing records)
ALTER TABLE "public"."stock_movements"
ADD COLUMN "user_id" UUID;

-- Step 2: Add foreign key constraint to profiles
ALTER TABLE "public"."stock_movements"
ADD CONSTRAINT "stock_movements_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "public"."profiles"("id")
ON DELETE SET NULL;  -- If user is deleted, keep the movement but set user_id to NULL

-- Step 3: Create index for better query performance
CREATE INDEX "idx_stock_movements_user_id" ON "public"."stock_movements" USING "btree" ("user_id");

-- Step 4: Add comment for documentation
COMMENT ON COLUMN "public"."stock_movements"."user_id" IS 'Profile UUID of the user who created this stock movement';

-- Step 5: Update existing records to set user_id (optional - sets to NULL for historical data)
-- Historical data will have user_id = NULL since we don't know who made those movements

-- Step 6: Modify create_stock_movement() function to include user_id
CREATE OR REPLACE FUNCTION "public"."create_stock_movement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into stock_movements(
    club_id,
    variant_id,
    type,
    quantity,
    reference_id,
    user_id  -- NEW: Track who made the sale
  )
  select
    s.club_id,
    new.variant_id,
    'sale',
    new.quantity,
    new.sale_id,
    s.user_id  -- Get user_id from the sales table
  from sales s
  where s.id = new.sale_id;

  return new;
end;
$$;

-- Step 7: Modify handle_purchase_order_delivered() function to include user_id
CREATE OR REPLACE FUNCTION "public"."handle_purchase_order_delivered"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  -- Solo procesar si cambió a delivered
  if new.status = 'delivered' and (old.status is null or old.status != 'delivered') then

    -- actualizar stock
    update inventory_items ii
    set stock = stock + (
      select poi.quantity
      from purchase_order_items poi
      where poi.purchase_order_id = new.id
        and poi.inventory_item_id = ii.id
    )
    from purchase_order_items poi
    where poi.purchase_order_id = new.id
      and poi.inventory_item_id = ii.id;

    -- crear movimientos con user_id
    insert into stock_movements (
      club_id,
      variant_id,
      type,
      quantity,
      reference_id,
      user_id  -- NEW: Track who marked as delivered
    )
    select
      ii.club_id,
      ii.variant_id,
      'restock',
      poi.quantity,
      new.id,
      auth.uid()  -- Current user who marked the order as delivered
    from purchase_order_items poi
    join inventory_items ii on ii.id = poi.inventory_item_id
    where poi.purchase_order_id = new.id;

  end if;

  return new;
end;
$$;

-- Note: Other functions that create stock_movements (returns, adjustments) should also be updated
-- to include user_id = auth.uid() when inserting into stock_movements
