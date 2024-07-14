const fs = require("fs").promises; // Импортируем промисы для работы с файловой системой
const path = require("path"); // Импортируем модуль path для работы с путями файлов и директорий
const sharp = require("sharp"); // Импортируем библиотеку sharp для работы с изображениями

// Экспортируем асинхронную функцию для конвертации изображений
module.exports = async ({
  input,
  output,
  lossless = false,
  quality = 50,
  effort = 4,
  chromaSubsampling = "4:4:4",
  keepMetadata = false,
  overwrite = false,
  appendExt = false,
  verbose = false,
}) => {
  // Формируем имя выходного файла
  let outputFilename = path.basename(input);
  if (appendExt) {
    outputFilename = outputFilename + ".avif";
  } else {
    outputFilename = outputFilename.replace(path.extname(input), ".avif");
  }
  // Определяем полный путь к выходному файлу
  const outputPath = path.join(output ? output : path.dirname(input), outputFilename);

  try {
    // Проверка существования файла
    const exists = await fs
      .access(outputPath)
      .then(() => true) // Файл существует
      .catch(() => false); // Файл не существует

    if (exists && !overwrite) {
      if (verbose) {
        process.stdout.write(`${input}: ${outputPath} already exists\n`);
      }

      return true; // Пропускаем конвертацию, если файл уже существует и перезапись не разрешена
    }
  } catch (err) {
    console.log(err);
  }

  try {
    quality = parseInt(quality, 10);
    effort = parseInt(effort, 10);
    lossless = JSON.parse(lossless);
    keepMetadata = JSON.parse(keepMetadata);

    // Создаем конвейер обработки изображения с помощью sharp
    const pipeline = sharp(input).avif({
      quality,
      effort,
      lossless,
      chromaSubsampling,
    });

    if (keepMetadata) {
      pipeline.withMetadata(); // Сохраняем метаданные, если это указано
    }

    await pipeline.toFile(outputPath); // Сохраняем результат в выходной файл

    if (verbose) {
      process.stdout.write(`${input}: created ${outputPath}\n`);
    }

    return true;
  } catch (err) {
    process.stderr.write(`${input}: ${err.message}\n`);
    return false;
  }
};
