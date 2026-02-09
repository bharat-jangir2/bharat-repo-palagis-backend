import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType, HttpStatus, HttpException } from '@nestjs/common';
import { AppModule } from './app.module';
import { CustomLogger } from './app/config/custom-logger';
import { AllExceptionsFilter } from './app/filters/all-exceptions.filter';
import { LoggerService } from './app/services/logger.service';

async function bootstrap() {
  // Use custom logger to filter out RoutesResolver and RouterExplorer logs
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(),
  });

  // Enable URI versioning - allows multiple versions to coexist
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1', // Default to v1 if no version specified
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;

  // Get LoggerService instance for exception filter
  const loggerService = app.get(LoggerService);

  // Register global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(loggerService));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        // Custom validation error formatting
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: errors.map((err) => {
              const constraints = err.constraints || {};
              return Object.values(constraints).join(', ');
            }),
            error: 'Validation Error',
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );

  app.enableCors();

  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API v1: http://localhost:${port}/v1`);
}
bootstrap();