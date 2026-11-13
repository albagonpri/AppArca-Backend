-- AlterTable Plaza: añadir alturaMaxima
ALTER TABLE "plazas" ADD COLUMN "alturaMaxima" DOUBLE PRECISION;

-- AlterTable Reserva: añadir vehiculoId y precioTotal
ALTER TABLE "reservas" ADD COLUMN "vehiculoId" INTEGER;
ALTER TABLE "reservas" ADD COLUMN "precioTotal" DECIMAL(10,2);

-- AddForeignKey Reserva -> Vehiculo
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_vehiculoId_fkey"
  FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

