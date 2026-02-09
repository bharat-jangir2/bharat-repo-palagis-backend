export default () => ({
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/palagis',
    options: {
      // MongoDB connection options
      // Note: Mongoose 6+ handles these automatically, but you can add custom options here
      // maxPoolSize: 10,
      // serverSelectionTimeoutMS: 5000,
      // socketTimeoutMS: 45000,
    },
  },
  environment: process.env.ENVIRONMENT || 'development',
});
