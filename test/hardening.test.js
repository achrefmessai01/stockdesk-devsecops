const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createServer, config } = require("../src/server");

test("liveness stays healthy during a database outage, readiness does not", async () => {
  config.dbHost = "127.0.0.1";
  config.dbPort = 1;
  const server = createServer();
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const live = await fetch(`${base}/live`);
    assert.equal(live.status, 200);
    assert.deepEqual(await live.json(), { status: "alive" });
    const ready = await fetch(`${base}/health`);
    assert.equal(ready.status, 503);
    await ready.json();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("startup does not disclose either configured credential", () => {
  const exampleDb = "example-db-regression-marker";
  const exampleKey = "example-api-regression-marker";
  const result = spawnSync(process.execPath, ["-e", "require('./src/server').start().close()"], {
    cwd: require("node:path").resolve(__dirname, ".."),
    env: { ...process.env, PORT: "0", DB_PASSWORD: exampleDb, API_KEY: exampleKey },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /StockDesk starting/);
  assert.ok(!(result.stdout + result.stderr).includes(exampleDb));
  assert.ok(!(result.stdout + result.stderr).includes(exampleKey));
});
