module.exports = {
  apps: [
    {
      name: 'fairdrop',
      script: 'server.js',
      env: {
        PORT: 3002,
        NODE_ENV: 'production'
      }
    }
  ]
}
