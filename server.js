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

app.post("/compress", upload.array("images", 10), (req, res) => {
  const outputDir = "compressed_images";

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const inputFiles = req.files;
  const outputFiles = [];

  let processedCount = 0; // Счетчик обработанных файлов

  inputFiles.forEach((file) => {
    const inputPath = file.path; // Путь к временному файлу
    const outputFileName = `${file.filename}.avif`; // Имя сжатого файла
    const outputPath = path.join(outputDir, outputFileName); // Полный путь к сжатому файлу

    outputFiles.push(outputPath); // Добавляем путь к сжатому файлу в массив

    // Команда для выполнения сжатия с использованием avif
    const avifCommand = `avif --input="${inputPath}" --output="${outputDir}/" --append-ext --overwrite`;

    console.log(`Executing command: ${avifCommand}`);

    // Выполняем команду сжатия
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

      // Если все файлы обработаны
      if (processedCount === inputFiles.length) {
        const zipFilename = `compressed_images-${uuidv4()}.zip`; // Уникальное имя для архива
        const zipPath = path.join(outputDir, zipFilename); // Путь к архиву

        const output = fs.createWriteStream(zipPath); // Создаем поток для записи архива
        const archive = archiver("zip", {
          zlib: { level: 9 }, // Уровень сжатия
        });

        output.on("close", () => {
          // Когда архивация завершена

          console.log(`${archive.pointer()} total bytes`);
          console.log("Archiver has been finalized and the output file descriptor has closed.");

          // Отправляем архив клиенту для скачивания
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

            // Удаляем временный архив после отправки клиенту
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

        archive.pipe(output); // Подключаем поток архивации к потоку вывода

        // Добавляем все сжатые файлы в архив
        outputFiles.forEach((file) => {
          archive.file(file, { name: path.basename(file) });
        });

        archive.finalize(); // Завершаем процесс архивации
      }
    });
  });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
