import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);

const teacherHtml = await readFile(new URL("../teacher-version/teacher-version.html", import.meta.url), "utf8");

assert.match(
  teacherHtml,
  /fetch\("\/api\/generate-comic"/,
  "teacher page should call the Vercel backend proxy"
);
assert.doesNotMatch(teacherHtml, /sk-[A-Za-z0-9_]{12,}/, "teacher page must not contain a literal API key");
assert.doesNotMatch(teacherHtml, /Bearer|DIRECT_KKSJ|cnapi|API_KEY/, "teacher page must not expose backend credential details");

const core = require("../api/generate-comic-core.js");

const copy = core.makeCopy("去死，今天作业太多了", "夸张漫画");
assert.equal(copy.tone, "夸张漫画");
assert.equal(copy.raw.includes("去死"), false);
assert.equal(copy.title, "作业怪兽突然出现");

let requestedUrl = "";
let requestedOptions = {};
const payload = await core.generateComicPayload(
  { complaint: "今天作业像过山车", tone: "温柔吐槽" },
  {
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    imageModel: "test-image-model",
    fetchImpl: async (url, options) => {
      requestedUrl = url;
      requestedOptions = options;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ b64_json: "abc123" }] })
      };
    }
  }
);

assert.equal(requestedUrl, "https://example.test/v1/images/generations");
assert.equal(requestedOptions.method, "POST");
assert.equal(requestedOptions.headers.Authorization, "Bearer test-key");
assert.match(requestedOptions.body, /test-image-model/);
assert.equal(payload.imageDataUrl, "data:image/png;base64,abc123");
assert.equal(payload.imageModel, "test-image-model");
assert.equal(payload.source, "kksj-image");

await assert.rejects(
  () => core.generateComicPayload({ complaint: "作业太多", tone: "轻松玩笑" }, { fetchImpl: async () => ({}) }),
  (error) => error.statusCode === 503 && /KKSJ_API_KEY/.test(error.message)
);

console.log("verify-vercel-proxy: OK");
