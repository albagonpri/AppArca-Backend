import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GeocodingService } from './geocoding.service.js';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    service = new GeocodingService();
    vi.restoreAllMocks();
  });

  describe('consultarCodigoPostal', () => {
    it('debe lanzar BadRequestException si el código postal no tiene exactamente 5 dígitos numéricos', async () => {
      await expect(service.consultarCodigoPostal('2801')).rejects.toThrow(BadRequestException);
      await expect(service.consultarCodigoPostal('280134')).rejects.toThrow(BadRequestException);
      await expect(service.consultarCodigoPostal('2801A')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el prefijo provincial es inválido (ej. 99000)', async () => {
      await expect(service.consultarCodigoPostal('99001')).rejects.toThrow(NotFoundException);
    });

    it('debe resolver provincia, municipio y poblaciones para un CP válido', async () => {
      // Mock de fetch para simular respuestas de CartoCiudad y Zippopotam
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/find?')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ lat: 43.35, lng: -5.12 }),
          });
        }
        if (url.includes('/reverseGeocode?')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                muni: 'Cangas de Onís',
                poblacion: 'Biamón',
              }),
          });
        }
        if (url.includes('zippopotam')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                places: [
                  { 'place name': 'Biamón' },
                  { 'place name': 'Cangas de Onís' },
                  { 'place name': 'Covadonga' },
                ],
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      global.fetch = mockFetch as any;

      const res = await service.consultarCodigoPostal('33550');

      expect(res.codigoPostal).toBe('33550');
      expect(res.provincia).toBe('Asturias');
      expect(res.municipio).toBe('Cangas de Onís');
      expect(res.poblaciones).toContain('Cangas de Onís');
      expect(res.poblaciones).toContain('Biamón');
      expect(res.poblaciones).toContain('Covadonga');
      expect(res.poblacionSugerida).toBe('Biamón');
    });
  });

  describe('buscarCandidatos', () => {
    it('cuando poblacion es distinta de ciudad, incluye poblacion en la query y municipio en municipio_filter', async () => {
      const mockCandidate = {
        id: '12345',
        address: 'Calle Mayor 10, Biamón, Cangas de Onís',
        lat: 43.3505,
        lng: -5.1205,
        muni: 'Cangas de Onís',
        province: 'Asturias',
        postalCode: '33550',
        type: 'portal',
      };

      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockCandidate]),
        });
      }) as any;

      const candidatos = await service.buscarCandidatos({
        calle: 'Calle Mayor',
        numero: '10',
        codigoPostal: '33550',
        ciudad: 'Cangas de Onís',
        poblacion: 'Biamón',
        provincia: 'Asturias',
      });

      expect(requestedUrl).toContain('municipio_filter=Cangas+de+On');
      expect(requestedUrl).toContain('q=Calle+Mayor+10+Biam');
      expect(candidatos.length).toBe(1);
      expect(candidatos[0].municipio).toBe('Cangas de Onís');
      expect(candidatos[0].latitud).toBe(43.3505);
      expect(candidatos[0].longitud).toBe(-5.1205);
    });

    it('cuando poblacion es igual a ciudad, no duplica el nombre en el parametro q', async () => {
      let requestedUrl = '';
      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: '999',
                address: 'Calle Alcalá 42, Madrid',
                lat: 40.418,
                lng: -3.698,
                muni: 'Madrid',
                province: 'Madrid',
                type: 'portal',
              },
            ]),
        });
      }) as any;

      await service.buscarCandidatos({
        calle: 'Calle Alcalá',
        numero: '42',
        codigoPostal: '28014',
        ciudad: 'Madrid',
        poblacion: 'Madrid',
        provincia: 'Madrid',
      });

      expect(requestedUrl).toContain('q=Calle+Alcal%C3%A1+42');
      expect(requestedUrl).not.toContain('q=Calle+Alcal%C3%A1+42+Madrid');
    });
  });
});
