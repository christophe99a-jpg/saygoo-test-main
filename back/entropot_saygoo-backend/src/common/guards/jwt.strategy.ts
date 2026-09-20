import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// La vérification doit être strictement alignée sur l'auth-service, qui signe
// les tokens avec JWT_ACCESS_SECRET et les émet pour saygoo-auth / saygoo-app.
// Un nom de variable différent ferait retomber sur une clé par défaut et
// provoquerait un rejet systématique (401) de tokens pourtant valides.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      throw new Error(
        "JWT_ACCESS_SECRET est absent : le service ne peut pas vérifier les tokens émis par l'auth-service.",
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer: 'saygoo-auth',
      audience: 'saygoo-app',
    });
  }

  async validate(payload: {
    sub: string;
    role: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    organisationId?: string;
  }) {
    // Les contrôleurs lisent req.user.sub : on conserve la charge utile telle
    // qu'émise, en plus des alias historiques.
    return {
      ...payload,
      userId: payload.sub,
    };
  }
}