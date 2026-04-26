-- Add missing UPDATE and DELETE policies for purchase_order_items
-- This fixes the "new row violates row-level security policy" error when updating purchase orders

-- ADD UPDATE POLICY
-- Permite a admins y managers actualizar items de purchase orders
CREATE POLICY "po items update" ON "public"."purchase_order_items"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "public"."purchase_orders" "po"
    JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true)
    WHERE "po"."id" = "purchase_order_items"."purchase_order_id"
      AND (
        -- Admins pueden actualizar cualquier purchase order item
        "p"."role" = 'admin'
        OR
        -- Managers pueden actualizar items de purchase orders de su club
        ("p"."role" = 'manager' AND "p"."club_id" = "po"."club_id")
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "public"."purchase_orders" "po"
    JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true)
    WHERE "po"."id" = "purchase_order_items"."purchase_order_id"
      AND (
        -- Admins pueden actualizar cualquier purchase order item
        "p"."role" = 'admin'
        OR
        -- Managers pueden actualizar items de purchase orders de su club
        ("p"."role" = 'manager' AND "p"."club_id" = "po"."club_id")
      )
  )
);

-- ADD DELETE POLICY
-- Permite a admins y managers eliminar items de purchase orders
CREATE POLICY "po items delete" ON "public"."purchase_order_items"
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM "public"."purchase_orders" "po"
    JOIN "public"."get_my_profile"() "p"("role", "club_id") ON (true)
    WHERE "po"."id" = "purchase_order_items"."purchase_order_id"
      AND (
        -- Admins pueden eliminar cualquier purchase order item
        "p"."role" = 'admin'
        OR
        -- Managers pueden eliminar items de purchase orders de su club
        ("p"."role" = 'manager' AND "p"."club_id" = "po"."club_id")
      )
  )
);
