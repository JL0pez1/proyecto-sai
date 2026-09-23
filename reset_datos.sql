-- =====================================================
-- RESET DE DATOS — Conserva únicamente la tabla `usuarios`
-- ⚠️  Este script elimina TODA la información operativa.
-- ⚠️  Haz un respaldo (dump) antes de ejecutarlo.
-- =====================================================

-- 1. Desactivar revisión de llaves foráneas
SET FOREIGN_KEY_CHECKS = 0;

-- 2. Vaciar tablas operativas (TRUNCATE reinicia AUTO_INCREMENT)
TRUNCATE TABLE detalle_cotizaciones;
TRUNCATE TABLE cotizaciones;

TRUNCATE TABLE comentarios_produccion;
TRUNCATE TABLE tiempos_produccion;
TRUNCATE TABLE historial_estados_orden;
TRUNCATE TABLE orden_maquina;
TRUNCATE TABLE consumo_insumos_orden;
TRUNCATE TABLE ordenes_produccion;

TRUNCATE TABLE notificaciones;

TRUNCATE TABLE clientes;

-- Catálogos (opcional: descomenta si quieres vaciarlos también)
TRUNCATE TABLE insumos;
TRUNCATE TABLE maquinas;

-- 3. Reactivar revisión de llaves foráneas
SET FOREIGN_KEY_CHECKS = 1;
