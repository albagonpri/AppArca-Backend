/*
  Warnings:

  - Made the column `matricula` on table `vehiculos` required. This step will fail if there are existing NULL values in that column.
  - Made the column `etiquetaAmbiental` on table `vehiculos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "vehiculos" ALTER COLUMN "marca" DROP NOT NULL,
ALTER COLUMN "modelo" DROP NOT NULL,
ALTER COLUMN "matricula" SET NOT NULL,
ALTER COLUMN "etiquetaAmbiental" SET NOT NULL;
