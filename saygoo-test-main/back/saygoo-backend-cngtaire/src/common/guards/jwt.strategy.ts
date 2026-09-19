import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Vérification alignée sur l'auth-service, qui signe les tokens avec
// JWT_ACCESS_SECRET et les émet pour saygoo-auth / saygoo-app.
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

  async validate(payload: Record<string, unknown>) {
    return payload;
  }
}
