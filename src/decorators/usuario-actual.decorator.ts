import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../guards/jwt.guard.js";

export const UsuarioActual = createParamDecorator(
  (propiedad: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const usuario = request.usuario as JwtPayload | undefined;
    return propiedad && usuario ? usuario[propiedad] : usuario;
  },
);
