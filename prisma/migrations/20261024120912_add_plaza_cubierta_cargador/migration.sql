-- AlterTable
ALTER TABLE "plazas" ADD COLUMN     "estaCubierta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tieneCargadorElectrico" BOOLEAN NOT NULL DEFAULT false;
