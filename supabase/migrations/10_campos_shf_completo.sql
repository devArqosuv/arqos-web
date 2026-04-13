-- =============================================================
-- Migración 10: Campos SHF completos para avalúos
-- Agrega todos los campos del template Excel "inmuebles UV"
-- para que el formato SHF esté completo en la DB.
-- Todos son opcionales (TEXT nullable) — se llenan progresivamente.
-- =============================================================

-- Identificación y folios adicionales
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS folio_infonavit TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS clave_unica_vivienda TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS clave_avaluo TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS vigencia TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS unidad_valuacion TEXT;

-- Datos catastrales y legales
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS cuenta_predial TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS cuenta_agua TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS regimen_propiedad TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS propietario TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS solicitante TEXT;

-- Marco legal y documental
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS documentacion_analizada TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS situacion_legal TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS restricciones_servidumbres TEXT;

-- Características urbanas
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS clasificacion_zona TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS infraestructura TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS servicios_urbanos TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS equipamiento TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS vialidades TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS construccion_predominante TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS vias_acceso TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS uso_predominante TEXT;

-- Descripción del inmueble
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS topografia_forma TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS descripcion_fisica TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS construcciones TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS instalaciones TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS estado_conservacion TEXT;

-- Entorno y análisis urbano
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS tipo_zona TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS uso_legal TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS uso_fisico TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS uso_financiero TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS uso_optimo TEXT;

-- Análisis de mercado
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS investigacion_mercado TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS rango_valores TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS homologacion TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS resultado_mercado TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC;

-- Enfoque físico
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS valor_construcciones NUMERIC;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS depreciacion NUMERIC;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS valor_fisico_total NUMERIC;

-- Enfoque de capitalización
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS cap_ingresos NUMERIC;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS cap_tasa NUMERIC;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS cap_valor NUMERIC;

-- Conciliación de valores
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS conciliacion_comparacion TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS conciliacion_ponderacion TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS conciliacion_justificacion TEXT;

-- Declaraciones y limitantes
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS declaracion_alcance TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS declaracion_supuestos TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS declaracion_limitaciones TEXT;

-- Elementos descriptivos
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS medidas_colindancias TEXT;
ALTER TABLE avaluos ADD COLUMN IF NOT EXISTS croquis_localizacion TEXT;
