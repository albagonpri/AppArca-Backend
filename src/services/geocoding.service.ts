import { BadRequestException, Injectable } from "@nestjs/common";

export interface DatosDireccion {
  calle: string;
  numero: string;
  codigoPostal: string;
  ciudad: string;
  provincia?: string;
}

export interface CoordenadasResultado {
  latitud: number;
  longitud: number;
}

export interface IGeocodingProvider {
  geocodificar(datos: DatosDireccion): Promise<CoordenadasResultado>;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  category?: string;
  type?: string;
  place_rank?: number;
  importance?: number;
  addresstype?: string;
  display_name?: string;
  address?: NominatimAddress;
}

@Injectable()
export class GeocodingService implements IGeocodingProvider {
  private ultimoLlamada = 0;
  private readonly USER_AGENT = "AppArca-Plataforma/1.0 (contacto@apparca.local)";
  private readonly TIMEOUT_MS = 8000;
  private readonly ERROR_PRECISION =
    "No se pudo localizar con suficiente precisión la dirección indicada. Revisa la calle, número, código postal y municipio.";

  private async esperarRateLimit(): Promise<void> {
    const ahora = Date.now();
    const transcurrido = ahora - this.ultimoLlamada;
    if (transcurrido < 1000) {
      await new Promise((resolve) => setTimeout(resolve, 1000 - transcurrido));
    }
    this.ultimoLlamada = Date.now();
  }

  private esSinNumero(numero: string): boolean {
    const limpio = numero.trim().toLowerCase().replace(/[.s/_-]/g, "");
    return (
      limpio === "sn" ||
      limpio === "sinnúmero" ||
      limpio === "sinnumero" ||
      limpio === "s"
    );
  }

  private coincideNumero(numeroUsuario: string, numeroOsm?: string): boolean {
    if (!numeroOsm) return false;
    const numUsuarioLimpio = numeroUsuario.trim().toLowerCase();
    const numOsmLimpio = numeroOsm.trim().toLowerCase();

    if (numUsuarioLimpio === numOsmLimpio) return true;

    // Acepta rangos o subdivisiones habituales en OSM (ej. "28" coincide con "28-30" o "28A")
    const partesOsm = numOsmLimpio.split(/[-/,]/).map((p) => p.trim());
    if (partesOsm.includes(numUsuarioLimpio)) return true;

    const digitosUsuario = numUsuarioLimpio.replace(/\D/g, "");
    const digitosOsm = numOsmLimpio.replace(/\D/g, "");
    return digitosUsuario.length > 0 && digitosUsuario === digitosOsm;
  }

  private async consultarNominatim(
    params: Record<string, string>,
  ): Promise<NominatimResult[]> {
    await this.esperarRateLimit();

    const query = new URLSearchParams({
      ...params,
      countrycodes: "es",
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
    });

    const url = "https://nominatim.openstreetmap.org/search?" + query.toString();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

    try {
      const respuesta = await fetch(url, {
        headers: {
          "User-Agent": this.USER_AGENT,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status);
      }

      const datos = (await respuesta.json()) as NominatimResult[];
      return Array.isArray(datos) ? datos : [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async geocodificar(datos: DatosDireccion): Promise<CoordenadasResultado> {
    const calle = datos.calle?.trim();
    const numero = datos.numero?.trim();
    const codigoPostal = datos.codigoPostal?.trim();
    const ciudad = datos.ciudad?.trim();
    const provincia = datos.provincia?.trim();

    if (!calle || !numero || !codigoPostal || !ciudad) {
      throw new BadRequestException(this.ERROR_PRECISION);
    }

    try {
      // Intento 1: Búsqueda estructurada completa con provincia si existe
      let resultados = await this.consultarNominatim({
        street: calle + " " + numero,
        postalcode: codigoPostal,
        city: ciudad,
        ...(provincia ? { state: provincia } : {}),
      });

      // Intento 2: Si no hubo resultado y se pasó provincia, buscar sin el filtro restrictivo de state
      if (resultados.length === 0 && provincia) {
        resultados = await this.consultarNominatim({
          street: calle + " " + numero,
          postalcode: codigoPostal,
          city: ciudad,
        });
      }

      // Intento 3: Búsqueda alternativa invirtiendo el formato a "numero, calle"
      if (resultados.length === 0) {
        resultados = await this.consultarNominatim({
          street: numero + ", " + calle,
          postalcode: codigoPostal,
          city: ciudad,
        });
      }

      if (resultados.length === 0) {
        throw new BadRequestException(this.ERROR_PRECISION);
      }

      const item = resultados[0];

      // Validación de país (debe pertenecer a España)
      const countryCode = item.address?.country_code?.toLowerCase();
      if (countryCode && countryCode !== "es") {
        throw new BadRequestException(this.ERROR_PRECISION);
      }

      // Validación numérica de coordenadas
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);

      if (
        isNaN(lat) ||
        isNaN(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        throw new BadRequestException(this.ERROR_PRECISION);
      }

      // Validación estricta de precisión por número de portal
      const requiereNumero = !this.esSinNumero(numero);
      if (requiereNumero) {
        const houseNumber = item.address?.house_number;
        if (!houseNumber || !this.coincideNumero(numero, houseNumber)) {
          throw new BadRequestException(this.ERROR_PRECISION);
        }
      }

      return {
        latitud: lat,
        longitud: lon,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }

      if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
        throw new BadRequestException(
          "El servicio de geolocalización tardó demasiado en responder. Por favor, inténtalo de nuevo.",
        );
      }

      throw new BadRequestException(
        "Error al conectar con el servicio de geolocalización. Por favor, inténtalo de nuevo en unos momentos.",
      );
    }
  }
}
