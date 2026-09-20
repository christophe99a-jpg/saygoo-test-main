import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Garde appliquée globalement : tout endpoint est protégé sauf s'il porte
 * explicitement @Public(). Un nouvel endpoint est donc sécurisé par défaut,
 * plutôt que de dépendre d'un @UseGuards qu'on peut oublier d'ajouter.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const estPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (estPublic) return true;

    return super.canActivate(context);
  }
}
