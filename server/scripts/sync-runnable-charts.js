const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const runnableChartTagName = "ppchart-runnable-beta";

function readRunnableCids(inputPath) {
  const absolutePath = path.resolve(inputPath);
  const content = fs.readFileSync(absolutePath, "utf8").trim();

  if (!content) {
    return [];
  }

  if (content.startsWith("[")) {
    return JSON.parse(content);
  }

  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((item) => item.rendered !== false)
    .map((item) => item.cid);
}

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error("Usage: node scripts/sync-runnable-charts.js <runnable-cids.json|scan-result.jsonl>");
  }

  const cids = Array.from(new Set(readRunnableCids(inputPath).filter(Boolean)));
  if (cids.length === 0) {
    throw new Error("No runnable chart cid found in input file.");
  }

  let tag = await prisma.tag.findFirst({
    where: { name: runnableChartTagName },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: runnableChartTagName },
    });
  }

  await prisma.mid.deleteMany({
    where: { tag_id: tag.id },
  });

  const charts = await prisma.chart.findMany({
    where: { cid: { in: cids } },
    select: { id: true, cid: true },
  });

  const chartIdByCid = new Map(charts.map((item) => [item.cid, item.id]));
  const missingCids = cids.filter((cid) => !chartIdByCid.has(cid));

  if (charts.length === 0) {
    throw new Error("No input cid exists in chart table.");
  }

  await prisma.mid.createMany({
    data: cids
      .map((cid) => chartIdByCid.get(cid))
      .filter(Boolean)
      .map((chartId) => ({
        chart_id: chartId,
        tag_id: tag.id,
        is_custom: 1,
      })),
  });

  console.log(
    JSON.stringify(
      {
        tag: runnableChartTagName,
        input: cids.length,
        linked: charts.length,
        missing: missingCids,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
