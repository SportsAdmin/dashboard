# Guía para Sincronizar Esquema de Supabase con el Proyecto Local

Esta guía te ayudará a traer **TODA la configuración de Supabase** (tablas, políticas RLS, funciones, edge functions, etc.) a tu proyecto local para tenerlo versionado en código.

## 🎯 Objetivo

Tener en el proyecto local:
- ✅ Todas las tablas y sus definiciones
- ✅ Todas las políticas RLS (Row Level Security)
- ✅ Todas las funciones SQL
- ✅ Todas las Edge Functions
- ✅ Configuración completa versionada en Git

## 📋 Pasos para Sincronizar

### Opción 1: Usando el Dashboard de Supabase (SIN Docker)

#### 1. Exportar el Esquema SQL Completo

1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/project/xzyludweikdwobsjgfkf
2. Ve a **SQL Editor**
3. Ejecuta este query para ver todas las tablas:

```sql
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

4. Para cada tabla importante (purchase_orders, purchase_order_items, profiles, etc.), ejecuta:

```sql
-- Ver estructura de la tabla
\d+ nombre_de_tabla

-- Ver políticas RLS de la tabla
SELECT * FROM pg_policies WHERE tablename = 'nombre_de_tabla';
```

#### 2. Exportar Políticas RLS

Ejecuta este script en el SQL Editor para obtener TODAS las políticas:

```sql
-- Ver todas las políticas RLS del proyecto
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Ver definiciones completas de políticas
SELECT
  pc.relname AS table_name,
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_clause,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_clause
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pn.nspname = 'public'
ORDER BY pc.relname, pol.polname;
```

#### 3. Exportar Funciones SQL

```sql
-- Ver todas las funciones
SELECT
  n.nspname as schema,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

#### 4. Exportar Edge Functions

Las Edge Functions ya están en tu proyecto en `supabase/functions/`. Verifica que estén todas:
- ✅ create-user
- ✅ create-club
- ❓ Otras...

#### 5. Crear Migración Inicial

Una vez que tengas toda esta información, crea una migración que capture el estado actual:

```bash
# Crear una nueva migración
npx supabase migration new initial_schema_snapshot
```

Y copia todo el esquema exportado en ese archivo.

### Opción 2: Instalando Docker (RECOMENDADO)

Si instalas Docker Desktop, podrás usar comandos más poderosos:

```bash
# 1. Instalar Docker Desktop
# Descarga desde: https://www.docker.com/products/docker-desktop

# 2. Una vez instalado, ejecuta:
npx supabase db pull --schema public

# Esto creará automáticamente una migración con TODO el esquema remoto
```

## 🔄 Flujo de Trabajo Recomendado

Una vez sincronizado, el flujo será:

### Para Cambios Locales → Supabase:
```bash
# 1. Crear una nueva migración
npx supabase migration new nombre_del_cambio

# 2. Editar el archivo de migración
# supabase/migrations/YYYYMMDDHHMMSS_nombre_del_cambio.sql

# 3. Aplicar a Supabase remoto
npx supabase db push
```

### Para Cambios Manuales en Supabase → Local:
```bash
# Traer cambios desde Supabase
npx supabase db pull --schema public

# Esto creará una nueva migración con los cambios
```

## 📊 Estado Actual del Proyecto

### Migraciones Locales Actuales:
- `20240405000001_create_user_function.sql` - ❌ No aplicada en Supabase
- `20240405090001_fix_profiles_rls_policy.sql` - ❌ No aplicada en Supabase
- `20240405093100_fix_profiles_rls_v2.sql` - ❌ No aplicada en Supabase
- `20260426020826_fix_profiles_rls_role_based.sql` - ❌ No aplicada en Supabase
- `20260426023000_fix_profiles_rls_no_recursion.sql` - ✅ Aplicada manualmente
- `20260426024401_add_purchase_order_items_rls.sql` - ⏳ Pendiente

### Edge Functions:
- ✅ `create-user` - Pendiente de deploy
- ✅ `create-club` - Revisar si está desplegada

## 🚨 Siguiente Paso Inmediato

**ANTES de aplicar cualquier migración**, necesitas:

1. **Exportar el esquema actual de Supabase** usando los queries SQL de arriba
2. **Copiar los resultados aquí** para que podamos revisar qué hay realmente en Supabase
3. **Decidir si:**
   - Creamos una migración inicial que capture todo lo que está en Supabase
   - O aplicamos las migraciones locales a Supabase (puede sobrescribir cambios manuales)

## 📝 Notas Importantes

- ⚠️ **NUNCA ejecutes `supabase db reset` en producción** - borrará todos los datos
- ✅ Siempre usa migraciones para cambios en el esquema
- 📦 Versiona las migraciones en Git
- 🔒 Las políticas RLS son CRÍTICAS - verifica antes de modificar
- 🧪 Prueba migraciones en un proyecto de desarrollo primero

## 🆘 Si Algo Sale Mal

Si accidentalmente borras políticas o configuraciones:

1. Ve al dashboard de Supabase
2. Busca en "Table Editor" → "Settings" → cada tabla tiene un botón para ver/editar RLS
3. También puedes restaurar desde backups automáticos de Supabase (Settings → Database → Backups)
