import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión con PostgreSQL establecida correctamente.');
    } catch (error) {
      this.logger.warn(
        'Aviso: No se pudo conectar inmediatamente a PostgreSQL en localhost:5432. ' +
          'El servidor HTTP iniciará normalmente, pero las consultas requerirán que la base de datos esté en ejecución.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
