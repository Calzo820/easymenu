import test from "node:test";
import assert from "node:assert/strict";
import { listTranslationLanguages, translatePublicContent } from "../controllers/translation.controller.js";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GOOGLE_TRANSLATE_API_KEY;
  else process.env.GOOGLE_TRANSLATE_API_KEY = originalApiKey;
});

test("returns verified languages when automatic translation is not configured", async () => {
  delete process.env.GOOGLE_TRANSLATE_API_KEY;
  const res = responseRecorder();
  await listTranslationLanguages({ query: { display: "it" } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.configured, false);
  assert.deepEqual(res.body.languages.map((language) => language.code), ["it", "en", "de", "es", "ru"]);
});

test("translates a validated public bundle through the configured provider", async () => {
  process.env.GOOGLE_TRANSLATE_API_KEY = "test-key";
  let providerCalls = 0;
  globalThis.fetch = async (_url, options) => {
    providerCalls += 1;
    const body = JSON.parse(options.body);
    return new Response(JSON.stringify({ data: { translations: body.q.map((value) => ({ translatedText: `EN: ${value}` })) } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const res = responseRecorder();
  await translatePublicContent({ body: { source: "it", target: "en", values: ["Test dinamico unico"] } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.translations, ["EN: Test dinamico unico"]);
  assert.equal(providerCalls, 1);
});

test("rejects invalid target languages before contacting the provider", async () => {
  process.env.GOOGLE_TRANSLATE_API_KEY = "test-key";
  const res = responseRecorder();
  await translatePublicContent({ body: { source: "it", target: "not_a_language", values: ["Test"] } }, res, (error) => { throw error; });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /destinazione/);
});
