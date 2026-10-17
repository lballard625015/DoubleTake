// Auth middleware: checkAuth verifies the Auth0 Bearer JWT and attaches req.user; requireRole enforces a role.
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const ROLE_CLAIM = 'https://safeharbor.app/role'
// Nessie account a parent owns; set as a custom claim by the same Auth0 Action that sets the role.
const ACCOUNT_CLAIM = 'https://safeharbor.app/accountId'

export interface AuthUser extends JwtPayload {
  role?: string
  accountId?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

const jwks = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
})

function verifyToken(token: string): Promise<JwtPayload> {
  const options: jwt.VerifyOptions = {
    audience: process.env.AUTH0_AUDIENCE,
    issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  }

  return new Promise((resolve, reject) => {
    const done: jwt.VerifyCallback = (err, decoded) =>
      err || !decoded || typeof decoded === 'string' ? reject(err ?? new Error('Invalid token')) : resolve(decoded)

    if (process.env.AUTH0_SECRET) {
      jwt.verify(token, process.env.AUTH0_SECRET, { ...options, algorithms: ['HS256'] }, done)
      return
    }
    jwt.verify(
      token,
      (header, callback) => {
        jwks.getSigningKey(header.kid, (err, key) => callback(err, key?.getPublicKey()))
      },
      { ...options, algorithms: ['RS256'] },
      done,
    )
  })
}

// Dev-only bypass: skips JWT checks and takes the role from the x-dev-role header. Never active in production.
const devBypass = process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production'

export const checkAuth: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (devBypass) {
    req.user = {
      sub: 'dev-user',
      role: String(req.headers['x-dev-role'] ?? 'parent'),
      accountId: String(req.headers['x-dev-account-id'] ?? process.env.DEV_ACCOUNT_ID ?? '') || undefined,
    }
    next()
    return
  }

  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  try {
    const decoded = await verifyToken(token)
    req.user = {
      ...decoded,
      role: decoded[ROLE_CLAIM] as string | undefined,
      accountId: decoded[ACCOUNT_CLAIM] as string | undefined,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
