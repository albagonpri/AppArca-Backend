-- CreateTable
CREATE TABLE "vehiculos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "matricula" TEXT,
    "longitud" DOUBLE PRECISION,
    "anchura" DOUBLE PRECISION,
    "altura" DOUBLE PRECISION,
    "suspensionBaja" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehiculos_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vehiculos" ADD CONSTRAINT "vehiculos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
