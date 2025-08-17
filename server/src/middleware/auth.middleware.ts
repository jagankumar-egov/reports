import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

declare global {
  namespace Express {
    interface Request {
      user?: {
        role: string;
        username: string;
      };
    }
  }
}

export const authenticateUser = (req: Request, _res: Response, next: NextFunction) => {
  // In production, this would validate JWT or session
  // For now, we use environment configuration
  const userRole = req.headers['x-user-role'] || config.defaultUserRole;
  const username = req.headers['x-username'] || 'system';

  req.user = {
    role: userRole as string,
    username: username as string,
  };

  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'reports-admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
};

export const requireViewer = (req: Request, res: Response, next: NextFunction) => {
  const allowedRoles = ['reports-admin', 'reports-viewer'];
  if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Viewer access required' });
  }
  return next();
};