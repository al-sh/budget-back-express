import * as express from 'express';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entity/User';
import { API_ROUTES } from '../constants/api-routes';

export class AuthController {
  constructor(ds: DataSource) {
    this.ds = ds;
    this.userRepository = this.ds.getRepository(User);

    this.router.use(this.checkTokenMiddleware);
    this.router.post(`${this.path}${API_ROUTES.AUTH}/password`, this.handlePasswordAuth);
  }

  public router = express.Router();

  private ds: DataSource;

  private path = '/';

  private userRepository: Repository<User>;

  private checkTokenMiddleware = async (request: express.Request, response: express.Response, next: express.NextFunction) => {
    console.log('req:', request.path);
    if (request.method === 'OPTIONS' || request.path === `/${API_ROUTES.AUTH}/password`) {
      next();
      return;
    }

    const reqToken = Array.isArray(request.headers.auth) ? request.headers.auth.join('') : request.headers.auth;
    const reqUserId = Number(Array.isArray(request.headers.userid) ? request.headers.userid.join('') : request.headers.userid);

    if (!reqUserId) {
      response.status(401);
      response.send({ message: 'Not auth E1' });
      return;
    }

    if (!reqToken) {
      response.status(401);
      response.send({ message: 'Not auth E2' });
      return;
    }

    const user: User | null = await this.userRepository.findOne({ where: { id: reqUserId, isBlocked: false, token: reqToken } });
    if (user) {
      next();
    } else {
      response.status(401);
      response.send({ message: 'Not auth' });
      return;
    }
  };

  private handlePasswordAuth = async (request: AuthPasswordRequest, response: express.Response) => {
    console.log(request.body);

    const { login, password } = request.body;

    const user: User | null = await this.userRepository.findOne({ where: { isBlocked: false, login: login } });
    if (!user) {
      response.status(403);
      response.send({ message: 'Incorrect username or password.' });
      return;
    }
    console.log('find user:', user);

    const enteredPwdHash = getPasswordHash(password);

    if (!(user.passwordHash === enteredPwdHash)) {
      response.status(403);
      response.send({ message: 'Incorrect username or password.' });
      if (!user?.loginAttemts) {
        user.loginAttemts = 0;
      }
      user.loginAttemts = user?.loginAttemts + 1;
      if (user.loginAttemts >= 3) user.isBlocked = true;
      await this.userRepository.save(user);
      return;
    } else {
      user.loginAttemts = 0;
      const newToken = Math.random().toString(36).substring(2);
      user.token = newToken;
      await this.userRepository.save(user);
      const resp: AuthResponse = { token: newToken, userId: user.id };
      response.send(resp);
      return;
    }
  };
}

export interface AuthResponse {
  token: string;
  userId: number;
}

export interface AuthPasswordRequest extends express.Request {
  body: { login: string; password: string };
}

export const getPasswordHash = (password: string) => {
  const salt = process.env.CRYPTO_SALT;

  if (!salt) {
    throw new Error('Salt not set. Check env CRYPTO_SALT');
  }

  return crypto.pbkdf2Sync(password, salt, Number(process.env.CRYPTO_ITERATIONS), 32, 'sha256').toString('hex');
};
