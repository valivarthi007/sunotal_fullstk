// PM2 Ecosystem Configuration — Production Grade
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'sunotal-backend',
      script: './dist/index.js',
      cwd: '/home/ec2-user/sunotal_fullstk/services/unified-backend',
      instances: 1,                // t2.micro has 1 vCPU — 1 instance is optimal
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '400M',  // Restart if process exceeds 400MB RAM
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',

      // Environment — Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/sunotal',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_SECRET: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
        FRONTEND_ORIGIN: 'https://sunotal.automateuniverse.space',
      },

      // Environment — Development
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
        MONGODB_URI: 'mongodb://127.0.0.1:27017/sunotal',
        REDIS_URL: 'redis://127.0.0.1:6379',
        JWT_SECRET: 'sunotal-dev-secret',
        FRONTEND_ORIGIN: '*',
      },

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      log_type: 'json',

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 8000,

      // Auto-restart cron (daily restart at 3 AM IST to flush memory)
      cron_restart: '30 21 * * *',  // 21:30 UTC = 03:00 IST
    }
  ]
};
