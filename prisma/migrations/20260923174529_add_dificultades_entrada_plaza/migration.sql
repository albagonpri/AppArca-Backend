-- CreateEnum
CREATE TYPE "DificultadEntrada" AS ENUM ('RESALTO', 'ENTRADA_ESTRECHA', 'RAMPA_PRONUNCIADA', 'PENDIENTE_PRONUNCIADA', 'GIRO_CERRADO', 'ALTURA_LIMITADA', 'ANCHURA_LIMITADA', 'OBSTACULOS', 'MANIOBRA_REDUCIDA', 'SUELO_IRREGULAR', 'VEHICULOS_BAJOS', 'OTRA');

-- AlterTable
ALTER TABLE "plazas" ADD COLUMN     "dificultadesEntrada" "DificultadEntrada"[] DEFAULT ARRAY[]::"DificultadEntrada"[];

-- Compatibilidad histórica: si entradaDificil = true y descripcionEntrada tiene texto, asignar ['OTRA']
UPDATE "plazas"
SET "dificultadesEntrada" = ARRAY['OTRA']::"DificultadEntrada"[]
WHERE "entradaDificil" = true
  AND "descripcionEntrada" IS NOT NULL
  AND TRIM("descripcionEntrada") <> '';
