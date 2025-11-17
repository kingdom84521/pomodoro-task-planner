import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { env, validateEnvironment } from './config/environment';
import { connectDatabase } from './config/database';
import { logger, morganStream } from './utils/logger';
import { errorHandler, notFoundHandler } from './api/middleware/errorHandler';

// Import routes
import authRoutes from './api/routes/auth';
import taskRoutes from './api/routes/tasks';
import pomodoroRoutes from './api/routes/pomodoro';
import configurationRoutes from './api/routes/configuration';
import analyticsRoutes from './api/routes/analytics';

// Import Socket.io handlers
import { initializePomodoroSocket, cleanupAllTimers } from './sockets/pomodoroSocket';

export class App {
  public app: Application;
  public server: HTTPServer | null = null;
  public io: SocketIOServer | null = null;
  private static instance: App;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    App.instance = this;
  }

  /**
   * Get the singleton App instance
   */
  public static getInstance(): App {
    if (!App.instance) {
      throw new Error('App not initialized');
    }
    return App.instance;
  }

  /**
   * Get the Socket.io server instance
   */
  public getIO(): SocketIOServer {
    if (!this.io) {
      throw new Error('Socket.IO not initialized');
    }
    return this.io;
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression
    this.app.use(compression());

    // Body parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookie parser
    this.app.use(cookieParser());

    // HTTP logging
    this.app.use(morgan('combined', { stream: morganStream }));

    // Disable X-Powered-By header
    this.app.disable('x-powered-by');
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
      });
    });

    // API routes
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/tasks', taskRoutes);
    this.app.use('/api/v1/pomodoro', pomodoroRoutes);
    this.app.use('/api/v1/configuration', configurationRoutes);
    this.app.use('/api/v1/analytics', analyticsRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public initializeSocketIO(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: env.SOCKET_IO_CORS_ORIGIN,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    // Initialize Pomodoro Socket.io handlers
    initializePomodoroSocket(this.io);

    logger.info('Socket.IO initialized');
  }

  public async start(): Promise<void> {
    try {
      // Validate environment
      validateEnvironment();

      // Connect to database
      await connectDatabase();

      // Create HTTP server
      this.server = this.app.listen(env.PORT, () => {
        logger.info(`Server started successfully`, {
          port: env.PORT,
          environment: env.NODE_ENV,
          nodeVersion: process.version,
        });
      });

      // Initialize Socket.IO
      this.initializeSocketIO(this.server);

      // Graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Clean up all Pomodoro timers
      cleanupAllTimers();

      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      if (this.io) {
        this.io.close(() => {
          logger.info('Socket.IO server closed');
        });
      }

      // Give ongoing requests 10 seconds to complete
      setTimeout(() => {
        logger.warn('Forcing shutdown after timeout');
        process.exit(0);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start server if this file is run directly
const app = new App();
app.start();

export default App;
