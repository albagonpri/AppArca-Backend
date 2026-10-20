-- CreateEnum
CREATE TYPE "TipoPropulsion" AS ENUM ('GASOLINA', 'DIESEL', 'HIBRIDO_NO_ENCHUFABLE', 'HIBRIDO_ENCHUFABLE', 'ELECTRICO_PURO', 'OTRO');

-- AlterTable
ALTER TABLE "vehiculos" ADD COLUMN     "anyo" INTEGER,
ADD COLUMN     "catalogoVehiculoId" INTEGER,
ADD COLUMN     "esEnchufable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipoPropulsion" "TipoPropulsion",
ADD COLUMN     "version" TEXT;

-- CreateTable
CREATE TABLE "catalogo_vehiculos" (
    "id" SERIAL NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "generacion" TEXT,
    "anyoInicio" INTEGER,
    "anyoFin" INTEGER,
    "carroceria" TEXT,
    "version" TEXT NOT NULL,
    "tipoPropulsion" "TipoPropulsion" NOT NULL,
    "combustibleDetalle" TEXT,
    "potenciaCv" INTEGER,
    "esEnchufable" BOOLEAN NOT NULL DEFAULT false,
    "etiquetaDgtSugerida" "EtiquetaAmbiental",
    "etiquetaDgtFiable" BOOLEAN NOT NULL DEFAULT false,
    "longitud" DOUBLE PRECISION,
    "anchura" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "origen" TEXT NOT NULL DEFAULT 'gor3a/vehicle-makes-models',
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalogo_vehiculos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalogo_vehiculos_marca_idx" ON "catalogo_vehiculos"("marca");

-- CreateIndex
CREATE INDEX "catalogo_vehiculos_modelo_idx" ON "catalogo_vehiculos"("modelo");

-- CreateIndex
CREATE INDEX "catalogo_vehiculos_marca_modelo_idx" ON "catalogo_vehiculos"("marca", "modelo");

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_catalogoVehiculoId_fkey" FOREIGN KEY ("catalogoVehiculoId") REFERENCES "catalogo_vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
