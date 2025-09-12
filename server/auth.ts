import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";
import { storage } from "./storage";
import { User as UserType } from "@shared/schema";

// Fix the MemoryStore import
import MemoryStoreFactory from "memorystore";
const MemoryStore = MemoryStoreFactory(session);

// Enhanced types
declare global {
  namespace Express {
    interface User extends Omit<UserType, 'password'> {
      lastLoginAt?: string;
    }
  }
}

interface AuthRequest extends Request {
  user?: Express.User;
}

const scryptAsync = promisify(scrypt);

// Configuration
const CONFIG = {
  // Session settings
  SESSION_SECRET: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production');
    }
    console.warn('⚠️ Using default session secret - not safe for production');
    return 'dev-secret-change-in-production';
  })(),

  // Security settings
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // Environment settings
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',
};

// Validation schemas
const registerSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(320, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${CONFIG.PASSWORD_MIN_LENGTH} characters`)
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .trim(),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .trim(),
  university: z.string()
    .max(100, 'University name too long')
    .trim()
    .optional(),
  graduationYear: z.number()
    .int()
    .min(2020)
    .max(2030)
    .optional(),
});

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(320, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long'),
});

// Enhanced password hashing with configurable cost
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(32).toString("hex"); // Increased salt size
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      throw new Error('Invalid password format');
    }

    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

// Rate limiting configurations
const createRateLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    // Store failed attempts by IP + email combination for login attempts
    keyGenerator: (req: Request) => {
      // Use the built-in helper for proper IPv6 handling
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      if (req.path === '/api/login' && req.body?.email) {
        return `${ip}-${req.body.email}`;
      }
      return ip;
    },
  });

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  CONFIG.MAX_LOGIN_ATTEMPTS,
  'Too many authentication attempts, please try again later'
);

const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // General API limit
  'Too many requests, please try again later'
);

// Enhanced auth middleware - Define early to avoid hoisting issues
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTHENTICATION_REQUIRED"
    });
  }
  next();
}

// Optional auth middleware (doesn't block, but adds user if authenticated)
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Just continue - user will be available if authenticated
  next();
}

// Admin role middleware (extend as needed)
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "Authentication required",
      code: "AUTHENTICATION_REQUIRED"
    });
  }

  // Add admin check logic here based on your user schema
  if (!(req.user as any).isAdmin) {
    logSecurityEvent('admin_access_denied', {
      userId: req.user.id,
      ip: req.ip,
    });
    return res.status(403).json({
      error: "Admin access required",
      code: "ADMIN_ACCESS_REQUIRED"
    });
  }

  next();
}

// Validation middleware
const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replace with validated data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Security logging
const logSecurityEvent = (event: string, details: any = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp} - ${event}:`, JSON.stringify(details));

  // In production, you'd want to send this to a proper logging service
  // like Winston, or a security monitoring service
};

// Enhanced session store setup
const createSessionStore = () => {
  if (CONFIG.IS_PRODUCTION) {
    // In production, you should use Redis or another persistent store
    console.warn('⚠️ Using memory store in production - consider Redis for scalability');
  }

  return new MemoryStore({
    checkPeriod: 86400000, // Prune expired entries every 24h
    max: 10000, // Limit memory usage
  });
};

export function setupAuth(app: Express) {
  // Security middleware - disable CSP in development to allow Vite HMR
  if (CONFIG.IS_PRODUCTION) {
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
  } else {
    // Development: disable CSP to allow Vite HMR
    app.use(helmet({
      contentSecurityPolicy: false,
    }));
  }

  // Add health check endpoint BEFORE rate limiting
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  
  // HEAD endpoint to stop the polling storm - ALWAYS return 200
  app.head('/api', (req, res) => {
    res.status(200).end();
  });
  app.head('/api/health', (req, res) => {
    res.status(200).end();
  });

  // Apply rate limiting - exclude HEAD and health endpoints
  app.use('/api/login', authLimiter);
  app.use('/api/register', authLimiter);
  
  // More selective rate limiting - exclude health checks and HEAD requests completely
  app.use('/api', (req, res, next) => {
    // Skip rate limiting for HEAD requests, health endpoints, and root API endpoint
    if (req.method === 'HEAD' || 
        req.path === '/api/health' || 
        req.path === '/api' ||
        req.url === '/api' ||
        req.url === '/api/health') {
      return next();
    }
    generalLimiter(req, res, next);
  });

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: createSessionStore(),
    name: 'session_id', // Don't use default 'connect.sid'
    cookie: {
      secure: CONFIG.IS_PRODUCTION, // HTTPS only in production
      httpOnly: true,
      maxAge: CONFIG.SESSION_MAX_AGE,
      sameSite: 'lax', // CSRF protection
    },
  };

  if (CONFIG.TRUST_PROXY) {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passReqToCallback: true,
      },
      async (req: Request, email: string, password: string, done) => {
        try {
          logSecurityEvent('login_attempt', {
            email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
          });

          const user = await storage.getUserByEmail(email);

          if (!user) {
            logSecurityEvent('login_failed_user_not_found', { email, ip: req.ip });
            return done(null, false, { message: "Invalid email or password" });
          }

          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            logSecurityEvent('login_failed_invalid_password', {
              email,
              userId: user.id,
              ip: req.ip,
            });
            return done(null, false, { message: "Invalid email or password" });
          }

          // Update last login time if the method exists
          if (typeof storage.updateUserLastLogin === 'function') {
            try {
              await storage.updateUserLastLogin(user.id);
            } catch (error) {
              console.warn('Failed to update last login time:', error);
            }
          }

          logSecurityEvent('login_success', {
            email,
            userId: user.id,
            ip: req.ip,
          });

          // Return user without password
          const { password: _, ...userWithoutPassword } = user;
          return done(null, {
            ...userWithoutPassword,
            lastLoginAt: new Date().toISOString(),
          });
        } catch (error) {
          logSecurityEvent('login_error', {
            email,
            error: error instanceof Error ? error.message : 'Unknown error',
            ip: req.ip,
          });
          return done(error);
        }
      }
    )
  );

  // Serialize/deserialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (error) {
      logSecurityEvent('deserialize_error', { userId: id, error: error instanceof Error ? error.message : 'Unknown error' });
      done(error);
    }
  });

  // Enhanced register endpoint
  app.post("/api/register", validateRequest(registerSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { email, password, firstName, lastName, university, graduationYear } = req.body;

      logSecurityEvent('registration_attempt', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        logSecurityEvent('registration_failed_user_exists', { email, ip: req.ip });
        return res.status(409).json({
          error: "An account with this email already exists",
          code: "USER_ALREADY_EXISTS"
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        university,
        graduationYear,
      });

      logSecurityEvent('registration_success', {
        email,
        userId: user.id,
        ip: req.ip,
      });

      // Automatically log the user in
      const { password: _, ...userWithoutPassword } = user;
      req.login(userWithoutPassword, (err) => {
        if (err) {
          logSecurityEvent('auto_login_after_registration_failed', {
            userId: user.id,
            error: err.message
          });
          return next(err);
        }

        res.status(201).json({
          user: userWithoutPassword,
          message: "Account created successfully"
        });
      });
    } catch (error) {
      logSecurityEvent('registration_error', {
        email: req.body?.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
      });

      console.error("Registration error:", error);
      res.status(500).json({
        error: "Failed to create account. Please try again.",
        code: "REGISTRATION_FAILED"
      });
    }
  });

  // Enhanced login endpoint
  app.post("/api/login", validateRequest(loginSchema), (req: AuthRequest, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login authentication error:", err);
        return res.status(500).json({
          error: "Authentication service error",
          code: "AUTH_SERVICE_ERROR"
        });
      }

      if (!user) {
        return res.status(401).json({
          error: info?.message || "Invalid credentials",
          code: "INVALID_CREDENTIALS"
        });
      }

      req.login(user, (err) => {
        if (err) {
          logSecurityEvent('login_session_error', {
            userId: user.id,
            error: err.message
          });
          return res.status(500).json({
            error: "Failed to establish session",
            code: "SESSION_ERROR"
          });
        }

        res.json({
          user,
          message: "Logged in successfully"
        });
      });
    })(req, res, next);
  });

  // Enhanced logout endpoint
  app.post("/api/logout", (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    req.logout((err) => {
      if (err) {
        logSecurityEvent('logout_error', {
          userId,
          error: err.message,
          ip: req.ip,
        });
        return next(err);
      }

      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          logSecurityEvent('session_destroy_error', {
            userId,
            error: err.message
          });
        } else {
          logSecurityEvent('logout_success', {
            userId,
            ip: req.ip,
          });
        }

        res.clearCookie('session_id');
        res.json({
          message: "Logged out successfully",
          success: true
        });
      });
    });
  });

  // Get current user endpoint with additional security
  app.get("/api/user", (req: AuthRequest, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "Not authenticated",
        code: "NOT_AUTHENTICATED"
      });
    }

    // Update last seen timestamp
    const userWithActivity = {
      ...req.user,
      lastSeenAt: new Date().toISOString(),
    };

    res.json(userWithActivity);
  });

  // Password change endpoint
  app.post("/api/change-password", requireAuth, validateRequest(z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string()
      .min(CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${CONFIG.PASSWORD_MIN_LENGTH} characters`)
      .max(128, 'Password too long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })), async (req: AuthRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Check if the storage methods exist before using them
      if (typeof storage.getUserWithPassword !== 'function') {
        console.error('storage.getUserWithPassword method not found');
        return res.status(500).json({
          error: "Password change feature not available",
          code: "FEATURE_NOT_AVAILABLE"
        });
      }

      if (typeof storage.updateUserPassword !== 'function') {
        console.error('storage.updateUserPassword method not found');
        return res.status(500).json({
          error: "Password change feature not available",
          code: "FEATURE_NOT_AVAILABLE"
        });
      }

      // Get user with password
      const user = await storage.getUserWithPassword(userId);
      if (!user) {
        return res.status(404).json({
          error: "User not found",
          code: "USER_NOT_FOUND"
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        logSecurityEvent('password_change_failed_invalid_current', {
          userId,
          ip: req.ip,
        });
        return res.status(400).json({
          error: "Current password is incorrect",
          code: "INVALID_CURRENT_PASSWORD"
        });
      }

      // Hash new password and update
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hashedNewPassword);

      logSecurityEvent('password_change_success', {
        userId,
        ip: req.ip,
      });

      res.json({
        message: "Password changed successfully",
        success: true
      });
    } catch (error) {
      logSecurityEvent('password_change_error', {
        userId: req.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        ip: req.ip,
      });

      console.error("Password change error:", error);
      res.status(500).json({
        error: "Failed to change password",
        code: "PASSWORD_CHANGE_FAILED"
      });
    }
  });
}