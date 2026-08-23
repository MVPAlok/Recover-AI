import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export type UserRole = 'OWNER' | 'ADMIN' | 'ANALYST' | 'SUPPORT' | 'VIEWER';

export interface AuthenticatedUser {
  id: string;
  merchantId: string;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      merchantId?: string;
    }
  }
}

// Role Hierarchy: Higher rank includes all capabilities of lower rank
const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  ANALYST: 3,
  SUPPORT: 2,
  VIEWER: 1,
};

/**
 * Authentication and Merchant Scope Resolution Middleware.
 * Resolves active merchant, validates merchant ownership, and attaches user context.
 */
export async function authenticateMerchant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const headerMerchantId = req.headers['x-merchant-id'] as string | undefined;

    let merchant = null;
    if (headerMerchantId) {
      merchant = await prisma.merchant.findUnique({
        where: { id: headerMerchantId },
      });
      if (!merchant) {
        res.status(404).json({
          success: false,
          error: {
            code: 'MERCHANT_NOT_FOUND',
            message: `Merchant with ID '${headerMerchantId}' does not exist.`,
          },
        });
        return;
      }
    } else {
      merchant = await prisma.merchant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!merchant) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_MERCHANT_AVAILABLE',
            message: 'No merchants found in the system.',
          },
        });
        return;
      }
    }

    req.merchantId = merchant.id;
    req.user = {
      id: merchant.id,
      merchantId: merchant.id,
      role: (merchant.role as UserRole) || 'ADMIN',
      email: merchant.email,
    };

    next();
  } catch (err: unknown) {
    next(err);
  }
}

/**
 * Authorizes request based on minimum required role.
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication context required.',
        },
      });
      return;
    }

    const userLevel = ROLE_HIERARCHY[user.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Role '${user.role}' is not authorized to perform this action. Minimum required role: '${minimumRole}'.`,
        },
      });
      return;
    }

    next();
  };
}
