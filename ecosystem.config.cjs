module.exports = {
  apps: [
    {
      name: 'angel-shop-api',
      script: './backend/src/index.js',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
