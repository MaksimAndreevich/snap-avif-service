const express = require("express"); // Импортируем Express для создания веб-сервера
const multer = require("multer"); // Импортируем Multer для обработки загрузки файлов
const { exec } = require("child_process"); // Импортируем exec из child_process для выполнения команд CLI
const fs = require("fs"); // Импортируем модуль fs для работы с файловой системой
const path = require("path"); // Импортируем модуль path для работы с путями файлов

const app = express(); // Создаем экземпляр приложения Express
const upload = multer({ dest: "uploads/" }); // Настраиваем Multer для сохранения загруженных файлов в папку uploads

// Обрабатываем POST-запрос на маршруте /compress
app.post("/compress", upload.single("image"), (req, res) => {
  const inputPath = req.file.path; // Получаем путь к загруженному файлу
  const outputPath = `compressed_${req.file.filename}.avif`; // Определяем путь для сжатого файла

  // Формируем команду для выполнения avif CLI
  const avifCommand = `avif ${inputPath} -o ${outputPath}`;

  // Выполняем команду avif CLI
  exec(avifCommand, (error, stdout, stderr) => {
    if (error) {
      // Если есть ошибка, выводим её в консоль и отправляем статус 500 клиенту
      console.error(`Error: ${error.message}`);
      return res.status(500).send("Error compressing image");
    }
    if (stderr) {
      // Если есть сообщения в stderr, выводим их в консоль
      console.error(`Stderr: ${stderr}`);
    }
    console.log(`Stdout: ${stdout}`); // Выводим stdout для информации

    // Отправляем сжатое изображение клиенту
    res.sendFile(path.resolve(outputPath), (err) => {
      if (err) {
        // Если есть ошибка при отправке файла, выводим её в консоль и отправляем статус 500 клиенту
        console.error(err);
        res.status(500).send("Error sending compressed image");
      }

      // Удаляем исходный и сжатый файлы из файловой системы
      fs.unlink(inputPath, (err) => {
        if (err) console.error(err);
      });
      fs.unlink(outputPath, (err) => {
        if (err) console.error(err);
      });
    });
  });
});

// Задаем порт для сервера
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Запускаем сервер и выводим сообщение о запуске
});
