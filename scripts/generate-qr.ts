// Generate QR code PNG from token
import QRCode from "qrcode";
import fs from "fs";

const token = process.argv[2];
const size = parseInt(process.argv[3] || "1024");
const label = process.argv[4] || "QR";
const outfile = process.argv[5] || `/tmp/qr-${token}.png`;

if (!token) {
  console.error("Usage: npx tsx scripts/generate-qr.ts <token> [size=1024] [label] [outfile]");
  process.exit(1);
}

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://bamboy.my.id";
const url = `${baseUrl}/r/${token}?utm_source=qr_${label.toLowerCase().replace(/\s+/g, "_")}&utm_medium=qr&utm_campaign=review`;

console.log(`Token:     ${token}`);
console.log(`Size:      ${size}px`);
console.log(`QR URL:    ${url}`);
console.log(`Output:    ${outfile}`);

async function main() {
  await QRCode.toFile(outfile, url, {
    errorCorrectionLevel: "M",
    width: size,
    margin: 2,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  const stat = fs.statSync(outfile);
  console.log(`\n✓ QR generated: ${stat.size} bytes`);
  console.log(`\nTest URL: ${baseUrl}/r/${token}/`);
  console.log(`Final destination: https://www.google.com/maps/place/?q=place_id:<feature_id>&utm_source=qr_${label.toLowerCase().replace(/\s+/g, "_")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
