export default () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    accessTokenTime: parseInt(process.env.JWT_ACCESS_TOKEN_TIME || '3600', 10),
  },
});
