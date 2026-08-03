const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");


class Env {
  dotEnvDevelopment = ".env.dev";
  dotEnvDefault = ".env";
  dotEnvTest = ".env.test";
  dotEnvProduction = ".env.production";

  requiredKeys = [];

  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dotEnvDefault)) {
      throw new Error("Please add a ,env file to the root directory");
    }

    dotenv.config({
      path: path.resolve(process.cwd(), this.dotEnvDefault),
    });

    const environment = this.getEnvironment();

    const envFile = this.getEnvFile(environment);

    // get a list of keys that _are not_ in .env but are required in this.requiredKeys
    const missingKeys = this.requiredKeys
      .map((key) => {
        // get this required key from the .env.* file
        const variable = this.getEnvironmentVariable(key);

        // if the variable is not defined
        if (variable === undefined || variable === null) {
          return key;
        }
      })
      // filter out any undefined values
      .filter((value) => value !== undefined);
    // if any keys are missing, throw an error.
    if (missingKeys.length) {
      const message = `
          The following required env variables are missing: 
              ${missingKeys.toString()}. 
          Please add them to your ${envFile} file
        `;
      throw new Error(message);
    }

    // re-configure dotenv with the new file
    dotenv.config({
      path: path.resolve(process.cwd(), envFile),
    });
  }

  getEnvFile(environment) {
    switch (environment) {
      case "development":
        return this.dotEnvDevelopment;
      case "test":
        return this.dotEnvTest;
      case "production":
        return this.dotEnvProduction
      case "ci":
      default:
        return this.dotEnvDefault;
    }
  }

  getEnvironmentVariable(variable) {
    return process.env[variable];
  }

  getEnvironment() {
    return this.getEnvironmentVariable("NODE_ENV");
  }

  isDevelopment() {
    return this.getEnvironment() === "development";
  }

  isTest() {
    return this.getEnvironment() === "test";
  }

  isProduction() {
    return this.getEnvironment() === "production";
  }

  isCI() {
    return this.getEnvironment() === "ci";
  }
}

const env = new Env();

module.exports = env;
