# Guía Rápida: Instalar Docker Desktop para Supabase

## 🎯 ¿Por qué Docker?

Con Docker instalado, **UN SOLO COMANDO** te traerá:
- ✅ Todo el esquema de Supabase (tablas, columnas, tipos)
- ✅ Todas las políticas RLS
- ✅ Todas las funciones SQL
- ✅ Todos los triggers
- ✅ Todos los índices
- ✅ Todo versionado automáticamente en una migración

**Sin Docker:** Tendrías que ejecutar 10+ queries manualmente y copiar/pegar resultados.

## 📥 Instalación de Docker Desktop

### Para macOS (tu caso):

1. **Descarga Docker Desktop**
   - Ve a: https://www.docker.com/products/docker-desktop
   - Haz clic en "Download for Mac"
   - Elige tu procesador:
     - **Mac con Apple Silicon (M1/M2/M3)**: Descarga "Apple Chip"
     - **Mac con Intel**: Descarga "Intel Chip"

2. **Instala Docker Desktop**
   - Abre el archivo `.dmg` descargado
   - Arrastra Docker.app a la carpeta Applications
   - Abre Docker Desktop desde Applications
   - Acepta los permisos cuando te los pida

3. **Verifica la instalación**
   - Docker Desktop debería mostrar un icono de ballena en la barra de menú
   - Espera a que diga "Docker Desktop is running"
   - Esto toma 1-2 minutos la primera vez

## ⚡ Comandos a Ejecutar (Después de Instalar Docker)

Una vez Docker esté corriendo, ejecuta estos comandos en tu terminal:

```bash
# 1. Verificar que Docker está corriendo
docker --version

# 2. Hacer pull del esquema completo de Supabase
npx supabase db pull --schema public

# 3. ¡Listo! Revisa el archivo de migración creado
ls -la supabase/migrations/
```

## 🎉 ¿Qué va a pasar?

Cuando ejecutes `npx supabase db pull`:

1. **Se conectará** a tu proyecto de Supabase remoto
2. **Descargará** TODO el esquema actual
3. **Creará automáticamente** un archivo de migración con timestamp
4. **El archivo contendrá**:
   - Todas las tablas con sus estructuras completas
   - Todas las políticas RLS con sus definiciones exactas
   - Todas las funciones SQL
   - Todos los triggers
   - Todos los índices y foreign keys

**Ejemplo del archivo que se creará:**
```
supabase/migrations/20260426030000_remote_schema.sql
```

## ⏱️ Tiempo Estimado

- **Descarga de Docker**: 5 minutos
- **Instalación**: 2 minutos
- **Primera ejecución**: 2 minutos
- **Pull del esquema**: 30 segundos

**Total: ~10 minutos** vs horas de trabajo manual

## 🚀 Siguiente Paso

Después del pull, podremos:
1. Ver exactamente qué hay en tu base de datos
2. Crear las migraciones faltantes (como la de purchase_order_items)
3. Aplicarlas con `npx supabase db push`
4. ¡Listo! Todo sincronizado

## ❓ Problemas Comunes

### "Docker daemon is not running"
- Solución: Abre Docker Desktop y espera a que el icono de ballena esté activo

### "Cannot connect to Docker"
- Solución: Reinicia Docker Desktop desde el menú

### "Permission denied"
- Solución: Asegúrate de haber aceptado todos los permisos cuando instalaste

## 📞 ¿Necesitas Ayuda?

Si tienes algún problema durante la instalación, avísame y te ayudo a resolverlo.

Una vez instalado, solo ejecuta `npx supabase db pull --schema public` y continuamos desde ahí.
