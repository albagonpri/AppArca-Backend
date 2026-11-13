BEGIN;
ALTER TABLE "reservas" ADD COLUMN "condicionesPlaza" JSONB;

CREATE FUNCTION condiciones_de_plaza(pid integer) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT to_jsonb(p) || jsonb_build_object('fotos', COALESCE(
    (SELECT jsonb_agg(to_jsonb(f) ORDER BY f.orden, f.id) FROM fotos_plazas f WHERE f."plazaId" = p.id), '[]'::jsonb))
  FROM plazas p WHERE p.id = pid
$$;

-- Para las reservas anteriores solo conocemos los datos disponibles hoy.
UPDATE reservas SET "condicionesPlaza" = condiciones_de_plaza("plazaId")
WHERE estado <> 'PENDIENTE';

CREATE FUNCTION fijar_condiciones_reserva() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'PENDIENTE' THEN
    NEW."condicionesPlaza" := NULL;
  ELSIF TG_OP = 'INSERT' OR OLD.estado = 'PENDIENTE' THEN
    NEW."condicionesPlaza" := condiciones_de_plaza(NEW."plazaId");
  ELSE
    NEW."condicionesPlaza" := OLD."condicionesPlaza";
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER condiciones_al_cambiar_estado BEFORE INSERT OR UPDATE OF estado ON reservas
FOR EACH ROW EXECUTE FUNCTION fijar_condiciones_reserva();

CREATE FUNCTION recalcular_pendientes_plaza() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE reservas SET "precioTotal" = round(NEW."precioHora"::numeric *
    extract(epoch FROM ("fechaFin" - "fechaInicio")) / 3600, 2),
    "fechaActualizacion" = CURRENT_TIMESTAMP
  WHERE "plazaId" = NEW.id AND estado = 'PENDIENTE';
  RETURN NEW;
END $$;

CREATE TRIGGER precio_al_editar_plaza AFTER UPDATE OF "precioHora" ON plazas
FOR EACH ROW WHEN (OLD."precioHora" IS DISTINCT FROM NEW."precioHora")
EXECUTE FUNCTION recalcular_pendientes_plaza();
COMMIT;
