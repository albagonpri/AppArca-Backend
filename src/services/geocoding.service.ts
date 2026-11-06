import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

export interface DatosDireccion {
  calle: string;
  numero: string;
  codigoPostal: string;
  ciudad: string;
  provincia?: string;
  poblacion?: string;
}

export interface CoordenadasResultado {
  latitud: number;
  longitud: number;
}

export interface CandidatoGeocodificacion {
  id: string;
  direccionCompleta: string;
  calle?: string;
  numero?: string;
  codigoPostal?: string;
  municipio?: string;
  provincia?: string;
  latitud: number;
  longitud: number;
  tipo: string;
  fuente: string;
}

export interface ResultadoCodigoPostal {
  codigoPostal: string;
  provincia: string;
  municipio: string;
  poblaciones: string[];
  poblacionSugerida: string;
}

export interface IGeocodingProvider {
  geocodificar(datos: DatosDireccion): Promise<CoordenadasResultado>;
  buscarCandidatos(datos: DatosDireccion): Promise<CandidatoGeocodificacion[]>;
  consultarCodigoPostal(codigoPostal: string): Promise<ResultadoCodigoPostal>;
}

interface CartoCiudadCandidate {
  id?: string;
  province?: string;
  muni?: string;
  type?: string;
  address?: string;
  postalCode?: string;
  poblacion?: string;
  tip_via?: string;
  lat?: number;
  lng?: number;
  portalNumber?: number | string;
  extension?: string;
  countryCode?: string;
}

interface CartoCiudadFindResult {
  lat?: number;
  lng?: number;
}

@Injectable()
export class GeocodingService implements IGeocodingProvider {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly TIMEOUT_MS = 6000;
  private readonly CARTOCIUDAD_BASE = "https://www.cartociudad.es/geocoder/api/geocoder";

  private esCoordenadaEspana(lat: number, lng: number): boolean {
    if (isNaN(lat) || isNaN(lng)) return false;
    // Límites de España incluyendo Península, Baleares y Canarias
    return lat >= 27.0 && lat <= 44.5 && lng >= -18.5 && lng <= 5.0;
  }

  private normalizarNumero(numero: string): string {
    return (numero || "").trim();
  }

  private async consultarCartoCiudadCandidates(
    params: Record<string, string>,
  ): Promise<CartoCiudadCandidate[]> {
    const urlParams = new URLSearchParams(params);
    const url = `${this.CARTOCIUDAD_BASE}/candidates?${urlParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const resp = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "AppArca-Plataforma/1.0",
        },
        signal: controller.signal,
      });

      if (!resp.ok) {
        this.logger.warn(`CartoCiudad HTTP ${resp.status} al consultar ${url}`);
        return [];
      }

      const datos = (await resp.json()) as CartoCiudadCandidate[];
      return Array.isArray(datos) ? datos : [];
    } catch (err: unknown) {
      if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
        this.logger.warn("CartoCiudad timeout tras " + this.TIMEOUT_MS + "ms");
      } else {
        this.logger.warn("Error conectando con CartoCiudad: " + String(err));
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async resolverCoordenadasFind(
    id: string,
    type: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const url = `${this.CARTOCIUDAD_BASE}/find?id=${encodeURIComponent(id)}&type=${encodeURIComponent(type)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const resp = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as CartoCiudadFindResult;
      if (data && typeof data.lat === "number" && typeof data.lng === "number") {
        return { lat: data.lat, lng: data.lng };
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Busca candidatos de geolocalización en CartoCiudad a partir de una dirección estructurada.
   */
  async buscarCandidatos(datos: DatosDireccion): Promise<CandidatoGeocodificacion[]> {
    const calle = datos.calle?.trim();
    const numero = this.normalizarNumero(datos.numero);
    const cp = datos.codigoPostal?.trim();
    const ciudad = datos.ciudad?.trim();
    const poblacion = datos.poblacion?.trim();

    if (!calle) {
      return [];
    }

    const queryTexto = numero ? `${calle} ${numero}` : calle;
    const candidatosNormalizados: CandidatoGeocodificacion[] = [];
    const idsVistos = new Set<string>();

    const tienePoblacionDistinta =
      Boolean(poblacion && ciudad && poblacion.toLowerCase() !== ciudad.toLowerCase());
    const queryConPoblacion = tienePoblacionDistinta ? `${queryTexto} ${poblacion}` : queryTexto;

    // 1. Intento principal: Búsqueda con código postal y municipio
    const params1: Record<string, string> = {
      q: queryConPoblacion,
      limit: "6",
    };
    if (cp) params1.cod_postal_filter = cp;
    if (ciudad) params1.municipio_filter = ciudad;

    let resultadosRaw = await this.consultarCartoCiudadCandidates(params1);

    // 2. Si no hubo resultados y teníamos población distinta, intentar con query básica + municipio_filter
    if (resultadosRaw.length === 0 && tienePoblacionDistinta) {
      resultadosRaw = await this.consultarCartoCiudadCandidates({
        q: queryTexto,
        limit: "6",
        ...(cp && { cod_postal_filter: cp }),
        ...(ciudad && { municipio_filter: ciudad }),
      });
    }

    // 3. Si no hay resultados y se especificó municipio_filter, intentar solo con código postal
    if (resultadosRaw.length === 0 && cp && ciudad) {
      resultadosRaw = await this.consultarCartoCiudadCandidates({
        q: queryConPoblacion,
        cod_postal_filter: cp,
        limit: "6",
      });
    }

    // 4. Si sigue sin resultados, buscar con texto libre (calle + número + poblacion + ciudad)
    if (resultadosRaw.length === 0) {
      const partesLibres = [calle, numero, tienePoblacionDistinta ? poblacion : null, ciudad].filter(Boolean);
      const qLibre = partesLibres.join(" ");
      resultadosRaw = await this.consultarCartoCiudadCandidates({
        q: qLibre,
        limit: "6",
      });
    }

    // Procesar y normalizar los resultados
    for (const item of resultadosRaw) {
      let lat = item.lat;
      let lng = item.lng;

      // Si lat/lng son 0 pero tiene id y type, resolver coordenadas centroides
      if ((!lat || !lng || (lat === 0 && lng === 0)) && item.id && item.type) {
        const coordsResueltas = await this.resolverCoordenadasFind(item.id, item.type);
        if (coordsResueltas) {
          lat = coordsResueltas.lat;
          lng = coordsResueltas.lng;
        }
      }

      if (lat != null && lng != null && this.esCoordenadaEspana(lat, lng)) {
        const idUnico = item.id || `${lat},${lng}`;
        if (idsVistos.has(idUnico)) continue;
        idsVistos.add(idUnico);

        const portalStr = item.portalNumber != null ? String(item.portalNumber) : "";
        const extensionStr = item.extension ? ` ${item.extension}` : "";
        const numFinal = portalStr ? `${portalStr}${extensionStr}` : numero;

        const locTexto = tienePoblacionDistinta && item.muni && poblacion?.toLowerCase() !== item.muni.toLowerCase()
          ? `${poblacion} (${item.muni || ciudad})`
          : item.muni || ciudad;

        candidatosNormalizados.push({
          id: idUnico,
          direccionCompleta: item.address || `${calle} ${numFinal}, ${locTexto}`,
          calle: item.tip_via ? `${item.tip_via} ${calle}` : calle,
          numero: numFinal,
          codigoPostal: item.postalCode || cp,
          municipio: item.muni || ciudad,
          provincia: item.province || datos.provincia,
          latitud: Math.round(lat * 1e6) / 1e6,
          longitud: Math.round(lng * 1e6) / 1e6,
          tipo: item.type || "portal",
          fuente: "CartoCiudad (IGN)",
        });
      }
    }

    return candidatosNormalizados;
  }

  /**
   * Geocodificación directa compatible con el método anterior.
   */
  async geocodificar(datos: DatosDireccion): Promise<CoordenadasResultado> {
    const candidatos = await this.buscarCandidatos(datos);

    if (candidatos.length > 0) {
      return {
        latitud: candidatos[0].latitud,
        longitud: candidatos[0].longitud,
      };
    }

    throw new BadRequestException(
      "No se pudo localizar automáticamente la dirección indicada. Por favor, confirma la ubicación en el mapa.",
    );
  }

  /**
   * Consulta la información geográfica asociada a un código postal español de 5 cifras.
   * Utiliza CartoCiudad y Zippopotam para resolver provincia, municipio y poblaciones asociadas.
   */
  async consultarCodigoPostal(codigoPostal: string): Promise<ResultadoCodigoPostal> {
    const cp = (codigoPostal || "").trim();
    if (!/^\d{5}$/.test(cp)) {
      throw new BadRequestException(
        "El código postal debe tener exactamente 5 dígitos numéricos.",
      );
    }

    const prefijo = cp.substring(0, 2);
    const provincia = PROVINCIAS_ESPANA[prefijo];
    if (!provincia) {
      throw new NotFoundException(
        `El código postal ${cp} no corresponde a ninguna provincia española válida.`,
      );
    }

    let cartoMuni: string | null = null;
    let cartoPob: string | null = null;

    // 1. Consultar CartoCiudad para extraer municipio oficial y población
    try {
      const urlFind = `${this.CARTOCIUDAD_BASE}/find?id=${encodeURIComponent(cp)}&type=Codpost`;
      const ctrl1 = new AbortController();
      const t1 = setTimeout(() => ctrl1.abort(), this.TIMEOUT_MS);
      const r1 = await fetch(urlFind, {
        headers: { Accept: "application/json", "User-Agent": "AppArca-Plataforma/1.0" },
        signal: ctrl1.signal,
      }).finally(() => clearTimeout(t1));

      if (r1.ok) {
        const d1 = (await r1.json()) as CartoCiudadFindResult;
        if (
          d1 &&
          typeof d1.lat === "number" &&
          typeof d1.lng === "number" &&
          (d1.lat !== 0 || d1.lng !== 0)
        ) {
          const urlRev = `${this.CARTOCIUDAD_BASE}/reverseGeocode?lat=${d1.lat}&lon=${d1.lng}`;
          const ctrl2 = new AbortController();
          const t2 = setTimeout(() => ctrl2.abort(), this.TIMEOUT_MS);
          const r2 = await fetch(urlRev, {
            headers: { Accept: "application/json", "User-Agent": "AppArca-Plataforma/1.0" },
            signal: ctrl2.signal,
          }).finally(() => clearTimeout(t2));

          if (r2.ok) {
            const d2 = (await r2.json()) as CartoCiudadCandidate;
            cartoMuni = d2.muni || null;
            cartoPob = d2.poblacion || null;
          }
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`CartoCiudad error al consultar CP ${cp}: ${String(err)}`);
    }

    // 2. Consultar Zippopotam para obtener listado de localidades y como respaldo
    let zipPlaces: string[] = [];
    try {
      const urlZip = `https://api.zippopotam.us/es/${encodeURIComponent(cp)}`;
      const ctrlZ = new AbortController();
      const tZ = setTimeout(() => ctrlZ.abort(), this.TIMEOUT_MS);
      const rz = await fetch(urlZip, {
        headers: { Accept: "application/json", "User-Agent": "AppArca-Plataforma/1.0" },
        signal: ctrlZ.signal,
      }).finally(() => clearTimeout(tZ));

      if (rz.ok) {
        const dz = (await rz.json()) as { places?: Array<{ "place name"?: string }> };
        if (Array.isArray(dz.places)) {
          zipPlaces = dz.places.map((p) => p["place name"] || "").filter(Boolean);
        }
      }
    } catch (err: unknown) {
      this.logger.warn(`Zippopotam error al consultar CP ${cp}: ${String(err)}`);
    }

    if (!cartoMuni && zipPlaces.length === 0) {
      throw new NotFoundException(
        `No se encontró información geográfica para el código postal ${cp}.`,
      );
    }

    const resultadoPoblaciones: string[] = [];
    const normalizados = new Set<string>();

    const normalizar = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    const agregarPoblacion = (nombre: string) => {
      const limpio = nombre.replace(/"/g, "'").trim();
      if (!limpio) return;
      const partes = limpio.includes("/") ? limpio.split("/").map((p) => p.trim()) : [limpio];
      for (const p of partes) {
        const norm = normalizar(p);
        if (!normalizados.has(norm)) {
          normalizados.add(norm);
          resultadoPoblaciones.push(p);
        }
      }
    };

    if (cartoMuni) agregarPoblacion(cartoMuni);
    if (cartoPob) agregarPoblacion(cartoPob);
    for (const p of zipPlaces) agregarPoblacion(p);

    const limpioMuni = cartoMuni?.replace(/"/g, "'").trim();
    const municipio =
      (limpioMuni?.includes("/") ? limpioMuni.split("/")[0].trim() : limpioMuni) ||
      zipPlaces[0] ||
      provincia;

    const poblacionSugerida =
      resultadoPoblaciones.find(
        (p) =>
          cartoPob &&
          (p.toLowerCase() === cartoPob.toLowerCase() ||
            cartoPob.toLowerCase().includes(p.toLowerCase())),
      ) ||
      resultadoPoblaciones[0] ||
      municipio;


    return {
      codigoPostal: cp,
      provincia,
      municipio,
      poblaciones: resultadoPoblaciones,
      poblacionSugerida,
    };
  }
}

const PROVINCIAS_ESPANA: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería", "05": "Ávila",
  "06": "Badajoz", "07": "Baleares", "08": "Barcelona", "09": "Burgos", "10": "Cáceres",
  "11": "Cádiz", "12": "Castellón", "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña",
  "16": "Cuenca", "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León", "25": "Lleida",
  "26": "La Rioja", "27": "Lugo", "28": "Madrid", "29": "Málaga", "30": "Murcia",
  "31": "Navarra", "32": "Ourense", "33": "Asturias", "34": "Palencia", "35": "Las Palmas",
  "36": "Pontevedra", "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona", "44": "Teruel",
  "45": "Toledo", "46": "Valencia", "47": "Valladolid", "48": "Bizkaia", "49": "Zamora",
  "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};
