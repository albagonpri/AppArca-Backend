import { ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from './jwt.guard.js';

@Injectable()
export class JwtOpcionalGuard extends JwtGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.headers.authorization === undefined) return true;
    return super.canActivate(context);
  }
}
