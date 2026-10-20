/*
  Warnings:

  - Added the required column `ancho` to the `plazas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `largo` to the `plazas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "plazas" ADD COLUMN     "ancho" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
ADD COLUMN     "descripcionEntrada" TEXT,
ADD COLUMN     "entradaDificil" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "largo" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
ADD COLUMN     "tieneCamaras" BOOLEAN NOT NULL DEFAULT false;

-- Drop temporary default constraints so future inserts must provide them
ALTER TABLE "plazas" ALTER COLUMN "ancho" DROP DEFAULT,
ALTER COLUMN "largo" DROP DEFAULT;
