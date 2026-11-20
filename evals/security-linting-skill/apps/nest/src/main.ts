// Planted issues. Every one is deliberate; the harness counts what flags them.
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // PLANT nestjs: CORS open to any origin.
  app.enableCors({ origin: '*' });
  await app.listen(3000);
}
bootstrap();
