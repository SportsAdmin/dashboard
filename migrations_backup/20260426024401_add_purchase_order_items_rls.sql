-- Add RLS policies for purchase_order_items table
-- This allows admins and managers to manage purchase order items

-- Enable RLS on purchase_order_items if not already enabled
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "purchase_order_items_select_policy" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_insert_policy" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_update_policy" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_delete_policy" ON purchase_order_items;

-- SELECT policy: Users can read items from purchase orders they have access to
CREATE POLICY "purchase_order_items_select_policy"
ON purchase_order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      -- Admins can see all purchase orders
      get_current_user_role() = 'admin'
      OR
      -- Managers can see purchase orders from their club
      (
        get_current_user_role() = 'manager'
        AND get_current_user_club_id() IS NOT NULL
        AND po.club_id = get_current_user_club_id()
      )
    )
  )
);

-- INSERT policy: Users can add items to purchase orders they have access to
CREATE POLICY "purchase_order_items_insert_policy"
ON purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      -- Admins can insert items to any purchase order
      get_current_user_role() = 'admin'
      OR
      -- Managers can insert items to purchase orders from their club
      (
        get_current_user_role() = 'manager'
        AND get_current_user_club_id() IS NOT NULL
        AND po.club_id = get_current_user_club_id()
      )
    )
  )
);

-- UPDATE policy: Users can update items from purchase orders they have access to
CREATE POLICY "purchase_order_items_update_policy"
ON purchase_order_items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      -- Admins can update all purchase order items
      get_current_user_role() = 'admin'
      OR
      -- Managers can update items from purchase orders in their club
      (
        get_current_user_role() = 'manager'
        AND get_current_user_club_id() IS NOT NULL
        AND po.club_id = get_current_user_club_id()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      -- Admins can update all purchase order items
      get_current_user_role() = 'admin'
      OR
      -- Managers can update items from purchase orders in their club
      (
        get_current_user_role() = 'manager'
        AND get_current_user_club_id() IS NOT NULL
        AND po.club_id = get_current_user_club_id()
      )
    )
  )
);

-- DELETE policy: Users can delete items from purchase orders they have access to
CREATE POLICY "purchase_order_items_delete_policy"
ON purchase_order_items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
    AND (
      -- Admins can delete all purchase order items
      get_current_user_role() = 'admin'
      OR
      -- Managers can delete items from purchase orders in their club
      (
        get_current_user_role() = 'manager'
        AND get_current_user_club_id() IS NOT NULL
        AND po.club_id = get_current_user_club_id()
      )
    )
  )
);
