// Diagnostic for FIREBASE_PRIVATE_KEY.
//
// Env files cannot hold real newlines, so the key is stored with "\n" escape
// sequences. Getting that by hand is the single most common Firebase Admin
// setup failure, and every way of getting it wrong produces the same useless
// error - "DECODER routines::unsupported", or Firebase's "Failed to parse
// private key" - which says nothing about the cause.
//
// This reports the SHAPE of the key as Next.js actually loads it, which is not
// necessarily what is written in the file, and whether it can be parsed. It
// never prints the key or any part of it.
//
//   node scripts/checkFirebaseKey.mjs

import crypto from "node:crypto";
// @next/env is CommonJS, so the named export comes off the default. Using
// Next's own loader matters: reading .env.local directly would miss the
// transformations Next applies, and those are usually where the problem is.
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

// Kept in step with normalisePrivateKey in lib/firebaseAdmin.js. Duplicated
// rather than imported because that module uses the "@/" path alias, which
// plain node cannot resolve.
function normalisePrivateKey(value) {
  let key = value.trim();
  key = key.replace(/,\s*$/, "");

  const isWrapped =
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"));

  if (isWrapped) key = key.slice(1, -1);

  return key.replace(/\\+n/g, "\n");
}

loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

const value = process.env.FIREBASE_PRIVATE_KEY;

if (!value) {
  console.log("FIREBASE_PRIVATE_KEY is not set. Add it to .env.local.");
  process.exit(1);
}

const countOf = (re) => (value.match(re) || []).length;
const trimmed = value.trim();

const hasWrappingQuotes =
  (trimmed.startsWith('"') && trimmed.replace(/,\s*$/, "").endsWith('"')) ||
  (trimmed.startsWith("'") && trimmed.replace(/,\s*$/, "").endsWith("'"));
const hasTrailingComma = /,\s*$/.test(trimmed) || /",\s*$/.test(trimmed);

console.log("=== as loaded by Next.js ===");
console.log("  length            :", value.length);
console.log("  real newlines     :", countOf(/\n/g));
console.log("  escape sequences  :", countOf(/\\+n/g));
console.log("  BEGIN marker      :", value.includes("-----BEGIN PRIVATE KEY-----"));
console.log("  END marker        :", value.includes("-----END PRIVATE KEY-----"));
console.log("  wrapping quotes   :", hasWrappingQuotes ? "yes (should not be there)" : "no");
console.log("  trailing comma    :", hasTrailingComma ? "yes (should not be there)" : "no");

const normalised = normalisePrivateKey(value);

console.log("\n=== after normalising ===");
console.log("  lines             :", normalised.trim().split("\n").length);
console.log("  stray backslashes :", (normalised.match(/\\/g) || []).length);

let parsed = null;
try {
  parsed = crypto.createPrivateKey(normalised);
  console.log("  parses            : YES -", parsed.asymmetricKeyType);
} catch (error) {
  console.log("  parses            : NO -", String(error.message).slice(0, 80));
}

console.log("\n=== verdict ===");

if (parsed) {
  if (hasWrappingQuotes || hasTrailingComma) {
    console.log("  The key is valid, but the value in .env.local carries extra");
    console.log("  characters:");
    if (hasTrailingComma) console.log("    - a trailing comma, copied from the JSON line");
    if (hasWrappingQuotes) console.log("    - quotes the env loader did not strip");
    console.log("  lib/firebaseAdmin.js strips both, so it works either way.");
    console.log("  Worth tidying anyway - the same value goes into the hosting");
    console.log("  dashboard, where the quoting rules are different again.");
  } else {
    console.log("  The key is valid and cleanly formatted.");
  }
  process.exit(0);
}

console.log("  The key cannot be parsed. Re-copy the private_key value from the");
console.log("  service account JSON: keep every \\n exactly as written, wrap the");
console.log("  whole thing in double quotes, and do not include the trailing");
console.log("  comma from the JSON line.");
process.exit(1);
