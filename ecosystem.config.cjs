module.exports = {
  apps: [
    {
      name: 'angel-shop-api',
      script: './backend/src/index.js',
      env: {
        NODE_ENV: 'production',
        ENABLE_CRON: process.env.ENABLE_CRON ?? 'false',
      },
    },
    {
      name: 'angel-shop-cron',
      script: './backend/src/cron.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
