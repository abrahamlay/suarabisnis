// Test parseGoogleMapsLink via tsx
import { parseGoogleMapsLink } from "../src/app/app/[tenant_slug]/reviews/actions";

async function main() {
  const url = process.argv[2] || "https://maps.app.goo.gl/i1UK3VBTJFHjD8gM7";
  console.log("Input:", url);
  const result = await parseGoogleMapsLink(url);
  console.log("Result:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
