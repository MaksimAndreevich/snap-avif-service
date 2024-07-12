const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const archiver = require("archiver");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());

const upload = multer({ dest: "uploads/" });

app.post("/compress", upload.array("images", 10), async (req, res) => {
  const outputDir = "compressed_images";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const inputFiles = req.files;
  const outputFiles = [];

  let processedCount = 0; // Счетчик обработанных файлов

  inputFiles.forEach((file) => {
    const inputPath = file.path;
    const outputFileName = `${file.filename}.avif`;
    const outputPath = path.join(outputDir, outputFileName);
    outputFiles.push(outputPath);

    // Параметры avif cli
    const quality = req.body.quality || 50;
    const effort = req.body.effort || 4;
    const lossless = req.body.lossless || false;
    const chromaSubsampling = req.body.chromaSubsampling || "4:4:4";
    const keepMetadata = req.body.keepMetadata || false;

    const avifCommand = `npx avif --input="${inputPath}" --output="${outputDir}/" --append-ext --overwrite --quality=${quality} --effort=${effort} --lossless=${lossless} --chroma-subsampling=${chromaSubsampling} --keep-metadata=${keepMetadata}`;

    console.log(`Executing command: ${avifCommand}`);

    exec(avifCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).send("Error compressing image");
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
      }
      console.log(`Stdout: ${stdout}`);

      processedCount++;

      if (processedCount === inputFiles.length) {
        // Если все файлы обработаны

        const zipFilename = `compressed_images-${uuidv4()}.zip`; // Генерируем уникальное имя для архива
        const zipPath = path.join(outputDir, zipFilename);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver("zip", {
          zlib: { level: 9 },
        });

        output.on("close", () => {
          console.log(`${archive.pointer()} total bytes`);
          console.log("Archiver has been finalized and the output file descriptor has closed.");

          res.download(zipPath, (err) => {
            if (err) {
              console.error(err);
              return res.status(500).send("Error sending compressed archive");
            }

            // Удаляем временные файлы
            inputFiles.forEach((file) => {
              fs.unlink(file.path, (err) => {
                if (err) console.error(err);
              });
            });
            outputFiles.forEach((file) => {
              fs.unlink(file, (err) => {
                if (err) console.error(err);
              });
            });

            // Удаляем временный архив
            fs.unlink(zipPath, (err) => {
              if (err) console.error(`Failed to delete archive: ${err}`);
              else console.log(`Deleted archive: ${zipPath}`);
            });
          });
        });

        output.on("end", () => {
          console.log("Data has been drained");
        });

        archive.on("warning", (err) => {
          if (err.code !== "ENOENT") {
            throw err;
          }
        });

        archive.on("error", (err) => {
          throw err;
        });

        archive.pipe(output);

        outputFiles.forEach((file) => {
          archive.file(file, { name: path.basename(file) });
        });

        archive.finalize();
      }
    });
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
