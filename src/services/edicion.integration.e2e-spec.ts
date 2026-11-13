import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service.js';
import { ReservasService } from './reservas.service.js';
import { PlazasService } from './plazas.service.js';
import { UsuariosService } from './usuarios.service.js';
import { UsuariosController } from '../controllers/usuarios.controller.js';
import { GeocodingService } from './geocoding.service.js';
import { validate } from 'class-validator';
import { NombrePerfilDto } from '../dto/usuarios/nombre-perfil.dto.js';

describe('Edición de perfil y condiciones de la plaza', () => {
  const prisma = new PrismaService({datasourceUrl: process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/app_arca_test'});
  const plazas = new PlazasService(prisma, new GeocodingService());
  const reservas = new ReservasService(prisma);
  const ids: number[] = [];
  async function usuario() {
    const u = await prisma.usuario.create({data:{nombre:'Prueba', correo:randomUUID()+'@example.test'}});
    ids.push(u.id);
    return u;
  }
  afterAll(async () => {
    await prisma.usuario.deleteMany({where:{id:{in:ids}}});
    await prisma.$disconnect();
  });
  it('solo cambia el nombre del usuario autenticado', async () => {
    const u = await usuario();
    const dto = Object.assign(new NombrePerfilDto(), {nombre:'  Alba María  '});
    const api = new UsuariosController(new UsuariosService(prisma));
    const editado = await api.actualizarPerfil({sub:u.id, correo:u.correo}, dto);
    expect(editado).toMatchObject({id:u.id,nombre:'Alba María',correo:u.correo});
    expect(await validate(Object.assign(new NombrePerfilDto(), {nombre:'   '}))).not.toHaveLength(0);
    expect(await validate(Object.assign(dto, {correo:'otro@example.test'}), {whitelist:true, forbidNonWhitelisted:true})).not.toHaveLength(0);
  });
  it('recalcula solo pendientes y conserva las condiciones al confirmar, cancelar y completar', async () => {
    const propietario = await usuario(), cliente = await usuario();
    const p = await plazas.crear(propietario.id, {titulo:'Original',calle:'Calle Prueba',numero:'1',ciudad:'Madrid',codigoPostal:'28001',
      latitud:40.4,longitud:-3.7,largo:5,ancho:2,precioHora:2,estaCubierta:true,tieneCargadorElectrico:false});
    const editar = (datos: Parameters<typeof plazas.actualizar>[2]) => plazas.actualizar(propietario.id,p.id,datos);
    await editar({titulo:'Antes de reservar'});
    await expect(plazas.actualizar(cliente.id,p.id,{titulo:'Ajena'})).rejects.toThrow('permiso');
    const reservar = (dia: string) => reservas.crear({usuarioId:cliente.id,plazaId:p.id,fechaInicio:'2090-01-'+dia+'T10:00:00Z',fechaFin:'2090-01-'+dia+'T11:30:00Z'});
    const confirmada = await reservar('10'), pendiente = await reservar('11');
    await reservas.actualizarEstadoPorUsuario(confirmada.id,propietario.id,false,'CONFIRMADA');
    await expect(editar({disponible:false})).rejects.toThrow('horario');
    await editar({titulo:'Nueva',precioHora:4,estaCubierta:false});
    const antigua = await reservas.obtenerPorId(confirmada.id, cliente.id);
    expect(antigua.plaza).toMatchObject({titulo:'Antes de reservar',precioHora:2,estaCubierta:true});
    expect(Number(antigua.precioTotal)).toBe(3);
    const actual = await reservas.obtenerPorId(pendiente.id,cliente.id);
    expect(actual.plaza.titulo).toBe('Nueva');
    expect(Number(actual.precioTotal)).toBe(6);
    expect(Number((await reservar('12')).precioTotal)).toBe(6);
    await reservas.actualizarEstadoPorUsuario(pendiente.id,cliente.id,false,'CANCELADA');
    await reservas.actualizarEstadoComoAdmin(confirmada.id,'COMPLETADA');
    await editar({titulo:'Última',precioHora:9});
    expect((await reservas.obtenerPorId(confirmada.id,cliente.id)).plaza.titulo).toBe('Antes de reservar');
    expect((await reservas.obtenerPorId(pendiente.id,cliente.id)).plaza.titulo).toBe('Nueva');
  });
});
