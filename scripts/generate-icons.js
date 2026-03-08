import svg2png from "svg2png";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgFile = path.resolve(__dirname, "../resources/icon.svg");
const outputDir = path.resolve(__dirname, "../resources");

const sizes = [16, 32, 64, 128, 256, 512, 1024];
const svgContent = fs.readFileSync(svgFile);

try {
  for (const size of sizes) {
    const pngBuffer = await svg2png({
      width: size,
      height: size,
      input: Buffer.from(svgContent),
    });

    const outputPath = path.join(outputDir, `icon-${size}.png`);
    fs.writeFileSync(outputPath, pngBuffer);
    console.log(`✓ Generated ${size}x${size}: icon-${size}.png`);
  }

  console.log("\n✓ All PNG icons generated successfully!");
} catch (err) {
  console.error("✗ Error generating icons:", err);
  process.exit(1);
}
