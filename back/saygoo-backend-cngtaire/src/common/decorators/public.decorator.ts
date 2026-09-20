import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Ouvre un endpoint sans authentification.
 * À n'utiliser que pour les points d'entrée réellement publics
 * (santé du service, par exemple) : tout le reste est protégé par défaut.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
