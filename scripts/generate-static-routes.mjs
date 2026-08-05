import { copyFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const routes = ['my-charts.html'];

for (const route of routes) {
  const outputPath = path.join(distDir, route);
  await copyFile(path.join(distDir, 'index.html'), outputPath);
}

console.log(`Generated ${routes.length} static application route`);
