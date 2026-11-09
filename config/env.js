const required = ["MONGO_URI", "JWT_SECRET"];

for (const name of required) {
  if (!process.env[name]) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
}