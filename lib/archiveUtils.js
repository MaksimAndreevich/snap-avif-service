const fs = require("fs");

function onCloseArchiveHandler(res, zipPath, inputFiles, outputFiles, stats) {
  // Событие закрытия потока
  console.log("Archiver has been finalized and the output file descriptor has closed.");

  res.setHeader("x-stats", JSON.stringify(stats));

  res.download(zipPath, (err) => {
    // Отправляем архив клиенту
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
}

function onEndArchiveHandler() {
  console.log("Data has been drained");
}

function onWarningArchiveHandler(err) {
  // Обработка предупреждений архивации
  if (err.code !== "ENOENT") {
    throw err;
  }
}

function onErrorArchiveHandler(err) {
  // Обработка ошибок архивации
  throw err;
}

module.exports = { onCloseArchiveHandler, onEndArchiveHandler, onWarningArchiveHandler, onErrorArchiveHandler };
