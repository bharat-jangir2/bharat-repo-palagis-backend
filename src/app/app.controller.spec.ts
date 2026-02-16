import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './controllers/users/user.controller';
import { AppService } from './services/app.service';

describe('UserController', () => {
  let userController: UserController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [AppService],
    }).compile();

    userController = app.get<UserController>(UserController);
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = userController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.message).toBeDefined();
    });
  });
});
