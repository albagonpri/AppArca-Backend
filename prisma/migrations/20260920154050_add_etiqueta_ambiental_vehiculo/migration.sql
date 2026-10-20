-- CreateEnum
CREATE TYPE "EtiquetaAmbiental" AS ENUM ('CERO', 'ECO', 'C', 'B', 'SIN_DISTINTIVO');

-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "etiquetaAmbiental" "EtiquetaAmbiental";
