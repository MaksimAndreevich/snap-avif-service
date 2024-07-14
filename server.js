const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const archiver = require("archiver");
const convert = require("./lib/convert");
const { onCloseArchiveHandler, onEndArchiveHandler, onWarningArchiveHandler, onErrorArchiveHandler } = require("./lib/archiveUtils");
const { INPUT_FOLDER_NAME, OUTPUT_FOLDER_NAME, MAX_FILES_ENTERED, ARCHIVE_FORMAT, ARCHIVE_LEVEL } = require("./lib/constants");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: INPUT_FOLDER_NAME });

app.post("/compress", upload.array("images", MAX_FILES_ENTERED), async (req, res) => {
  const outputDir = OUTPUT_FOLDER_NAME;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const inputFiles = req.files;
  const outputFiles = [];

  let processedCount = 0;

  inputFiles.forEach((file) => {
    const inputPath = file.path;
    const outputFileName = `${file.filename}.avif`;
    const outputPath = path.join(outputDir, outputFileName);

    outputFiles.push(outputPath); // Добавляем путь к выходному файлу в массив

    const options = {
      input: inputPath,
      output: outputDir,
      quality: parseInt(req.body.quality) || 50,
      effort: parseInt(req.body.effort) || 4,
      lossless: JSON.parse(req.body.lossless) || false,
      chromaSubsampling: req.body.chromaSubsampling || "4:4:4",
      keepMetadata: JSON.parse(req.body.keepMetadata) || false,
      overwrite: true,
      appendExt: true,
      verbose: true,
    };

    convert(options).then((result) => {
      if (result) {
        processedCount++; // Увеличиваем счетчик обработанных файлов

        if (processedCount === inputFiles.length) {
          // Если все файлы обработаны
          const zipFilename = `${OUTPUT_FOLDER_NAME}-${uuidv4()}.zip`; // Генерируем уникальное имя для архива
          const zipPath = path.join(outputDir, zipFilename); // Полный путь к архиву
          const output = fs.createWriteStream(zipPath); // Создаем поток для записи архива

          const archive = archiver(ARCHIVE_FORMAT, {
            zlib: { level: ARCHIVE_LEVEL },
          }); // Настраиваем архиватор

          output.on("close", () => onCloseArchiveHandler(res, zipPath, inputFiles, outputFiles));
          output.on("end", () => onEndArchiveHandler());
          archive.on("warning", (err) => onWarningArchiveHandler(err));
          archive.on("error", (err) => onErrorArchiveHandler(err));

          archive.pipe(output); // Подключаем поток архивации к потоку вывода

          outputFiles.forEach((file) => {
            // Добавляем сжатые файлы в архив
            archive.file(file, { name: path.basename(file) });
          });

          archive.finalize(); // Завершаем процесс архивации
        }
      } else {
        res.status(500).send("Error compressing image"); // Отправляем ошибку клиенту, если конвертация не удалась
      }
    });
  });
});

const PORT = process.env.PORT || 8000; // Указываем порт для сервера
app.listen(PORT, () => {
  // Запускаем сервер
  console.log(`Server is running on port ${PORT}`);
});
