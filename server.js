const express = require("express"); // Подключаем Express.js для создания сервера
const multer = require("multer"); // Подключаем Multer для обработки файлов, загружаемых на сервер
const { exec } = require("child_process"); // Подключаем модуль child_process для выполнения команд в терминале
const fs = require("fs"); // Подключаем модуль fs для работы с файловой системой
const path = require("path"); // Подключаем модуль path для работы с путями к файлам и директориям
const cors = require("cors"); // Подключаем CORS для обеспечения работы с клиентами на другом домене

const app = express(); // Создаем экземпляр приложения Express
app.use(cors()); // Используем CORS middleware для разрешения CORS запросов

const upload = multer({ dest: "uploads/" }); // Настраиваем Multer для временного сохранения загруженных файлов в 'uploads/' директорию

app.post("/compress", upload.single("image"), (req, res) => {
  // Обработчик POST запроса на /compress

  const inputPath = req.file.path; // Получаем путь к загруженному файлу из запроса
  const outputDir = "compressed_images"; // Указываем директорию для сохранения сжатых изображений
  const outputPath = path.join(outputDir, `${req.file.filename}.avif`); // Формируем путь к выходному файлу AVIF

  // Создаем выходную директорию, если она не существует
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const avifCommand = `avif --input="${inputPath}" --output="${outputDir}/" --append-ext`;

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

    fs.access(outputPath, fs.constants.F_OK, (err) => {
      // Проверяем, существует ли конечный файл .avif

      if (err) {
        // Если конечный файл не найден
        console.error(`File not found: ${outputPath}`); // Выводим сообщение об ошибке в консоль
        console.error(`Possible issues with avif CLI execution`); // Выводим дополнительную информацию для отладки
        return res.status(404).send("Compressed image not found"); // Отправляем клиенту статус 404 и сообщение об ошибке
      }

      // Отправляем сжатый файл клиенту
      res.sendFile(path.resolve(outputPath), (err) => {
        if (err) {
          // Если произошла ошибка при отправке файла клиенту
          console.error(err); // Выводим ошибку в консоль для отладки
          res.status(500).send("Error sending compressed image"); // Отправляем клиенту статус 500 и сообщение об ошибке
        }

        // Удаляем временные файлы
        fs.unlink(inputPath, (err) => {
          if (err) console.error(err); // Выводим ошибку удаления в консоль для отладки
        });
        fs.unlink(outputPath, (err) => {
          if (err) console.error(err); // Выводим ошибку удаления в консоль для отладки
        });
      });
    });
  });
});

const PORT = process.env.PORT || 8000; // Задаем порт для сервера
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Выводим сообщение в консоль при запуске сервера
});
