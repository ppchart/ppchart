module.exports = {
  "apps":
    [
      {
        "name": "chart-api",
        "script": "server.js",
        "instances": 2,
        "env": {
          "NODE_ENV": "development",
        },
        "env_test": {
          "NODE_ENV": "test",
        },
        "env_production": {
          "NODE_ENV": "production",
        }
      }
    ]
}
