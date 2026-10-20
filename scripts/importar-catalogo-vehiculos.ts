import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient, TipoPropulsion, EtiquetaAmbiental } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizarDimension(mmStr?: string): number | null {
  if (!mmStr) return null;
  const mm = parseFloat(mmStr);
  if (isNaN(mm) || mm <= 0) return null;
  // Convertir mm a metros redondeado a 2 decimales
  return Math.round((mm / 1000) * 100) / 100;
}

function clasificarPropulsion(fuelType: string): {
  tipoPropulsion: TipoPropulsion;
  esEnchufable: boolean;
} {
  const ft = (fuelType || '').toLowerCase().trim();

  if (ft === 'electric') {
    return { tipoPropulsion: TipoPropulsion.ELECTRICO_PURO, esEnchufable: true };
  }

  if (ft.includes('plug-in hybrid')) {
    return { tipoPropulsion: TipoPropulsion.HIBRIDO_ENCHUFABLE, esEnchufable: true };
  }

  if (ft.includes('hybrid') || ft.includes('mild hybrid')) {
    return { tipoPropulsion: TipoPropulsion.HIBRIDO_NO_ENCHUFABLE, esEnchufable: false };
  }

  if (ft === 'diesel') {
    return { tipoPropulsion: TipoPropulsion.DIESEL, esEnchufable: false };
  }

  if (ft === 'gasoline') {
    return { tipoPropulsion: TipoPropulsion.GASOLINA, esEnchufable: false };
  }

  return { tipoPropulsion: TipoPropulsion.OTRO, esEnchufable: false };
}

function estimarEtiquetaDgt(
  tipoPropulsion: TipoPropulsion,
  anyoInicio?: number | null,
  fuelOriginal?: string,
): { etiquetaDgtSugerida: EtiquetaAmbiental | null; etiquetaDgtFiable: boolean } {
  // 1. Eléctrico Puro (BEV): Distintivo CERO oficial y fiable
  if (tipoPropulsion === TipoPropulsion.ELECTRICO_PURO) {
    return { etiquetaDgtSugerida: EtiquetaAmbiental.CERO, etiquetaDgtFiable: true };
  }

  // 2. Híbrido Enchufable (PHEV):
  // CERO si autonomía >= 40 km, ECO si < 40 km.
  // Como la autonomía exacta no consta en la ficha básica, sugerimos CERO con advertencia (no fiable al 100%)
  if (tipoPropulsion === TipoPropulsion.HIBRIDO_ENCHUFABLE) {
    return { etiquetaDgtSugerida: EtiquetaAmbiental.CERO, etiquetaDgtFiable: false };
  }

  // 3. Híbridos no enchufables (HEV / MHEV) y Gas (GLP / GNC):
  if (tipoPropulsion === TipoPropulsion.HIBRIDO_NO_ENCHUFABLE) {
    if (anyoInicio && anyoInicio >= 2006) {
      return { etiquetaDgtSugerida: EtiquetaAmbiental.ECO, etiquetaDgtFiable: true };
    }
    return { etiquetaDgtSugerida: EtiquetaAmbiental.ECO, etiquetaDgtFiable: false };
  }

  const fuelLower = (fuelOriginal || '').toLowerCase();
  if (fuelLower.includes('gas') || fuelLower.includes('lpg') || fuelLower.includes('hydrogen')) {
    return { etiquetaDgtSugerida: EtiquetaAmbiental.ECO, etiquetaDgtFiable: false };
  }

  // 4. Gasolina:
  // Euro 4, 5, 6 (matriculados a partir de 2006) -> C
  // Euro 3 (matriculados entre 2001 y 2005) -> B
  // Anterior a 2001 -> SIN_DISTINTIVO
  if (tipoPropulsion === TipoPropulsion.GASOLINA) {
    if (anyoInicio) {
      if (anyoInicio >= 2006) {
        return { etiquetaDgtSugerida: EtiquetaAmbiental.C, etiquetaDgtFiable: true };
      }
      if (anyoInicio >= 2001) {
        return { etiquetaDgtSugerida: EtiquetaAmbiental.B, etiquetaDgtFiable: true };
      }
      return { etiquetaDgtSugerida: EtiquetaAmbiental.SIN_DISTINTIVO, etiquetaDgtFiable: true };
    }
    return { etiquetaDgtSugerida: null, etiquetaDgtFiable: false };
  }

  // 5. Diésel:
  // Euro 6 (matriculados a partir de 2015) -> C
  // Euro 4 o 5 (matriculados entre 2006 y 2014) -> B
  // Anterior a 2006 -> SIN_DISTINTIVO
  if (tipoPropulsion === TipoPropulsion.DIESEL) {
    if (anyoInicio) {
      if (anyoInicio >= 2015) {
        return { etiquetaDgtSugerida: EtiquetaAmbiental.C, etiquetaDgtFiable: true };
      }
      if (anyoInicio >= 2006) {
        return { etiquetaDgtSugerida: EtiquetaAmbiental.B, etiquetaDgtFiable: true };
      }
      return { etiquetaDgtSugerida: EtiquetaAmbiental.SIN_DISTINTIVO, etiquetaDgtFiable: true };
    }
    return { etiquetaDgtSugerida: null, etiquetaDgtFiable: false };
  }

  return { etiquetaDgtSugerida: null, etiquetaDgtFiable: false };
}

async function main() {
  const rutaCsv = path.join(__dirname, 'data', 'engines.csv');
  console.log(`[Importador] Leyendo archivo: ${rutaCsv}`);

  if (!fs.existsSync(rutaCsv)) {
    throw new Error(`No se encontró el archivo CSV en: ${rutaCsv}`);
  }

  const contenido = fs.readFileSync(rutaCsv, 'utf8');
  const lineas = contenido.split('\n').filter((l) => l.trim().length > 0);

  if (lineas.length <= 1) {
    throw new Error('El archivo CSV está vacío o solo contiene cabecera.');
  }

  const cabeceras = parseCSVLine(lineas[0]);
  const indices: Record<string, number> = {};
  cabeceras.forEach((c, i) => (indices[c.trim()] = i));

  console.log(`[Importador] Columnas detectadas: ${Object.keys(indices).join(', ')}`);
  console.log(`[Importador] Total de líneas a procesar: ${lineas.length - 1}`);

  const marcas = new Set<string>();
  const vistos = new Set<string>();
  const registrosParaInsertar: any[] = [];
  let conDimensiones = 0;
  let conEtiquetaFiable = 0;

  for (let i = 1; i < lineas.length; i++) {
    const valores = parseCSVLine(lineas[i]);
    const marca = valores[indices['make']];
    const modelo = valores[indices['model']];
    if (!marca || !modelo) continue;

    const generacion = valores[indices['generation']] || null;
    const genYearStartStr = valores[indices['gen_year_start']];
    const genYearEndStr = valores[indices['gen_year_end']];
    const anyoInicio = genYearStartStr ? parseInt(genYearStartStr, 10) : null;
    const anyoFin = genYearEndStr ? parseInt(genYearEndStr, 10) : null;
    const carroceria = valores[indices['body_type']] || null;
    const version = valores[indices['engine_label']] || 'Estándar';
    const fuelTypeOriginal = valores[indices['fuel_type']] || '';
    const powerHpStr = valores[indices['power_hp']];
    const potenciaCv = powerHpStr ? parseInt(powerHpStr, 10) : null;

    const longitud = normalizarDimension(valores[indices['length_mm']]);
    const anchura = normalizarDimension(valores[indices['width_mm']]);
    const altura = normalizarDimension(valores[indices['height_mm']]);

    const { tipoPropulsion, esEnchufable } = clasificarPropulsion(fuelTypeOriginal);
    const { etiquetaDgtSugerida, etiquetaDgtFiable } = estimarEtiquetaDgt(
      tipoPropulsion,
      anyoInicio,
      fuelTypeOriginal,
    );

    // Clave para evitar duplicados idénticos
    const claveDuplicado = `${marca.toLowerCase()}|${modelo.toLowerCase()}|${generacion?.toLowerCase() || ''}|${anyoInicio || ''}|${version.toLowerCase()}`;
    if (vistos.has(claveDuplicado)) {
      continue;
    }
    vistos.add(claveDuplicado);

    marcas.add(marca);
    if (longitud != null && anchura != null && altura != null) {
      conDimensiones++;
    }
    if (etiquetaDgtFiable) {
      conEtiquetaFiable++;
    }

    registrosParaInsertar.push({
      marca,
      modelo,
      generacion,
      anyoInicio,
      anyoFin,
      carroceria,
      version,
      tipoPropulsion,
      combustibleDetalle: fuelTypeOriginal || null,
      potenciaCv: isNaN(potenciaCv as number) ? null : potenciaCv,
      esEnchufable,
      etiquetaDgtSugerida,
      etiquetaDgtFiable,
      longitud,
      anchura,
      altura,
      origen: 'gor3a/vehicle-makes-models',
    });
  }

  console.log(`[Importador] Preparados ${registrosParaInsertar.length} registros únicos.`);
  console.log(`[Importador] Marcas encontradas: ${marcas.size}`);
  console.log(
    `[Importador] Registros con dimensiones completas (L, W, H): ${conDimensiones} (${(
      (conDimensiones / registrosParaInsertar.length) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `[Importador] Registros con etiqueta DGT fiable: ${conEtiquetaFiable} (${(
      (conEtiquetaFiable / registrosParaInsertar.length) *
      100
    ).toFixed(1)}%)`,
  );

  // Limpiar catálogo previo de forma segura si ya existía para evitar duplicados en re-ejecución
  const cuentaPrevia = await prisma.catalogoVehiculo.count();
  if (cuentaPrevia > 0) {
    console.log(`[Importador] Vaciando catálogo anterior (${cuentaPrevia} registros)...`);
    // Desvincular referencias de vehiculos creados si las hubiera
    await prisma.vehiculo.updateMany({
      where: { catalogoVehiculoId: { not: null } },
      data: { catalogoVehiculoId: null },
    });
    await prisma.catalogoVehiculo.deleteMany({});
  }

  console.log('[Importador] Insertando registros en PostgreSQL en lotes...');
  const TAMANO_LOTE = 1000;
  for (let i = 0; i < registrosParaInsertar.length; i += TAMANO_LOTE) {
    const lote = registrosParaInsertar.slice(i, i + TAMANO_LOTE);
    await prisma.catalogoVehiculo.createMany({
      data: lote,
    });
    const progreso = Math.min(i + TAMANO_LOTE, registrosParaInsertar.length);
    console.log(`  -> Insertados ${progreso} / ${registrosParaInsertar.length} registros...`);
  }

  const cuentaFinal = await prisma.catalogoVehiculo.count();
  console.log(`[Importador] ¡Éxito! Total de vehículos en catálogo: ${cuentaFinal}`);
}

main()
  .catch((e) => {
    console.error('[Importador] Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
