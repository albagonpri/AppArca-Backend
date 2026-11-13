CREATE TYPE "TipoDisponibilidad" AS ENUM ('HABITUAL', 'PUNTUAL');
ALTER TABLE "plazas" ADD COLUMN "tipoDisponibilidad" "TipoDisponibilidad" NOT NULL DEFAULT 'HABITUAL';
