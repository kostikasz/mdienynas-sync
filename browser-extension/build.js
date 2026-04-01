const esbuild = require("esbuild")
const fs = require("fs")

async function build() {
  fs.mkdirSync("dist/popup", { recursive: true })
  fs.mkdirSync("dist/icons", { recursive: true })

  await Promise.all([
    esbuild.build({
      entryPoints: ["src/background.ts"],
      bundle: true,
      outfile: "dist/background.js",
      platform: "browser",
      target: "chrome112",
    }),
    esbuild.build({
      entryPoints: ["src/popup/popup.ts"],
      bundle: true,
      outfile: "dist/popup/popup.js",
      platform: "browser",
      target: "chrome112",
    }),
  ])

  fs.copyFileSync("src/popup/popup.html", "dist/popup/popup.html")
  fs.copyFileSync("src/popup/popup.css", "dist/popup/popup.css")
  fs.copyFileSync("manifest.json", "dist/manifest.json")

  for (const size of [16, 48, 128]) {
    fs.copyFileSync(`icons/${size}.png`, `dist/icons/${size}.png`)
  }

  console.log("Build complete → dist/")
}

build().catch((err) => {
  console.error(err)
  process.exit(1)
})
