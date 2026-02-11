export default () => ({
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    accessTokenTime: parseInt(process.env.JWT_ACCESS_TOKEN_TIME || '3600', 10), // 1 hour
    refreshTokenTime: parseInt(process.env.JWT_REFRESH_TOKEN_TIME || '604800', 10), // 7 days
  },
});
