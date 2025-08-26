import * as dotenv from 'dotenv';
import { cleanEnv, str, EnvError, EnvMissingError } from 'envalid';

dotenv.config();

const envValidators = {
  PORT: str(),
  DATABASE_HOST: str(),
  DATABASE_PORT: str(),
  DATABASE_NAME: str(),
  DATABASE_USER: str(),
  DATABASE_PASSWORD: str(),
  DATABASE_SCHEMA: str(),
  MODEL_SERVICE_URL: str(),
};

export const env = cleanEnv(process.env, envValidators, {
  reporter: ({ errors }) => {
    if (Object.keys(errors).length) {
      for (const [envVar, err] of Object.entries(errors)) {
        if (err instanceof EnvError) {
          console.error(err, `[ENV]: invalid env ${envVar}`);
        } else if (err instanceof EnvMissingError) {
          console.error(err, `[ENV]: missing env ${envVar}`);
        } else {
          console.error(err, `[ENV]: something went wrong with ${envVar}`);
        }
      }

      process.exit(1);
    }
  },
});
