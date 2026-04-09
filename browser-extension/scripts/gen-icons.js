const { PNG } = require("pngjs")
const fs = require("fs")
const path = require("path")

const sizes = [16, 48, 128]
const [R, G, B] = [49, 87, 44] // #31572c — --accent color

fs.mkdirSync(path.join(__dirname, "../icons"), { recursive: true })

for (const size of sizes) {
  const png = new PNG({ width: size, height: size })
  for (let i = 0; i < size * size * 4; i += 4) {
    png.data[i] = R
    png.data[i + 1] = G
    png.data[i + 2] = B
    png.data[i + 3] = 255
  }
  const buf = PNG.sync.write(png)
  const outPath = path.join(__dirname, `../icons/${size}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`Created icons/${size}.png (${buf.length} bytes)`)
}
