const express = require("express");
const multer = require("multer");
const fsExtra = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();

// Настройка CORS
app.use(
  cors({
    origin: "*", // Разрешаем доступ с любых источников в локальной сети
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);

// Middleware для парсинга JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка папок для хранения файлов - исправлено для соответствия текущей структуре проекта
const uploadDirAvatars = path.join(__dirname, "../soundfeedback-main/public/images/avatars");
const uploadDirNews = path.join(__dirname, "../soundfeedback-main/public/images/news");
const uploadDirCovers = path.join(__dirname, "../soundfeedback-main/public/images/covers");

// Создаем директории если они не существуют
fsExtra.ensureDirSync(uploadDirAvatars);
fsExtra.ensureDirSync(uploadDirNews);
fsExtra.ensureDirSync(uploadDirCovers);

// Настройка multer для аватаров
const storageAvatars = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirAvatars);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadAvatars = multer({
  storage: storageAvatars,
  fileFilter: (req, file, cb) => {
    console.log("Multer fileFilter (avatars):", file.originalname, file.mimetype);
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      const error = new Error("Только изображения допустимых форматов!");
      console.error("Multer fileFilter error (avatars):", error.message);
      cb(error);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Настройка multer для новостей
const storageNews = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirNews);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadNews = multer({
  storage: storageNews,
  fileFilter: (req, file, cb) => {
    console.log("Multer fileFilter (news):", file.originalname, file.mimetype);
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      const error = new Error("Только изображения допустимых форматов!");
      console.error("Multer fileFilter error (news):", error.message);
      cb(error);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Настройка multer для обложек альбомов
const storageCovers = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirCovers);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadCovers = multer({
  storage: storageCovers,
  fileFilter: (req, file, cb) => {
    console.log("Multer fileFilter (covers):", file.originalname, file.mimetype);
    const filetypes = /jpeg|jpg|png|gif|webp|bmp|svg|tiff|tif|avif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      const error = new Error("Только изображения допустимых форматов!");
      console.error("Multer fileFilter error (covers):", error.message);
      cb(error);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware для обработки ошибок Multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer error:", err.message);
    return res.status(400).json({ error: err.message });
  } else if (err) {
    console.error("General error:", err.message);
    return res.status(500).json({ error: err.message });
  }
  next();
});

// Статическая папка для доступа к файлам
app.use("/images/avatars", express.static(uploadDirAvatars));
app.use("/images/news", express.static(uploadDirNews));
app.use("/images/covers", express.static(uploadDirCovers)); // Добавляем папку для обложек

// Эндпоинт для загрузки аватара
app.post("/upload-avatar", uploadAvatars.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не предоставлен" });
    }
    const avatarPath = `/images/avatars/${req.file.filename}`;
    console.log(`Аватар загружен: ${avatarPath}, Пользователь: ${req.body.username || "Неизвестный"}`);
    res.status(200).json({ avatarUrl: avatarPath });
  } catch (error) {
    console.error("Error in /upload-avatar:", error.message);
    res.status(500).json({ error: error.message || "Ошибка загрузки файла" });
  }
});

// Эндпоинт для загрузки изображений новости
app.post("/upload-news", uploadNews.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Файлы не предоставлены" });
    }
    const imageUrls = req.files.map((file) => `/images/news/${file.filename}`);
    console.log(`Изображения новости загружены: ${imageUrls.join(", ")}`);
    res.status(200).json({ imageUrls });
  } catch (error) {
    console.error("Error in /upload-news:", error.message);
    res.status(500).json({ error: error.message || "Ошибка загрузки файлов" });
  }
});

// Эндпоинт для загрузки обложки альбома
app.post("/upload-cover", uploadCovers.single("cover"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Файл не предоставлен" });
    }
    const coverPath = `/images/covers/${req.file.filename}`;
    console.log(`Обложка альбома загружена: ${coverPath}`);
    res.status(200).json({ coverUrl: coverPath });
  } catch (error) {
    console.error("Error in /upload-cover:", error.message);
    res.status(500).json({ error: error.message || "Ошибка загрузки файла" });
  }
});

// Эндпоинт для удаления аватара
app.delete("/delete-avatar", (req, res) => {
  console.log("DELETE /delete-avatar received:", req.body);
  const avatarUrl = req.body.avatarUrl;
  const username = req.body.username || "Неизвестный";
  if (!avatarUrl) {
    return res.status(400).json({ error: "URL аватара не предоставлен" });
  }

  try {
    const fileName = path.basename(avatarUrl);
    const filePath = path.join(uploadDirAvatars, fileName);
    if (fsExtra.existsSync(filePath)) {
      fsExtra.removeSync(filePath);
      console.log(`Аватар удалён: ${avatarUrl}, Пользователь: ${username}`);
      res.status(200).json({ message: "Аватар успешно удалён" });
    } else {
      console.warn(`Файл не найден: ${filePath}`);
      res.status(404).json({ error: "Файл не найден" });
    }
  } catch (error) {
    console.error("Error in /delete-avatar:", error.message);
    res.status(500).json({ error: error.message || "Ошибка удаления файла" });
  }
});

// Эндпоинт для удаления изображений новости
app.delete("/delete-news", (req, res) => {
  console.log("DELETE /delete-news received:", req.body);
  const imageUrls = req.body.imageUrls;
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: "URL изображений новости не предоставлены или не являются массивом" });
  }

  try {
    imageUrls.forEach((url) => {
      const fileName = path.basename(url);
      const filePath = path.join(uploadDirNews, fileName);
      if (fsExtra.existsSync(filePath)) {
        fsExtra.removeSync(filePath);
        console.log(`Изображение новости удалено: ${url}`);
      } else {
        console.warn(`Файл не найден: ${filePath}`);
      }
    });
    res.status(200).json({ message: "Изображения новости успешно удалены" });
  } catch (error) {
    console.error("Error in /delete-news:", error.message);
    res.status(500).json({ error: error.message || "Ошибка удаления файлов" });
  }
});

// Эндпоинт для удаления обложки альбома
app.delete("/delete-cover", (req, res) => {
  console.log("DELETE /delete-cover received:", req.body);
  const coverUrl = req.body.coverUrl;
  if (!coverUrl) {
    return res.status(400).json({ error: "URL обложки не предоставлен" });
  }

  try {
    const fileName = path.basename(coverUrl);
    const filePath = path.join(uploadDirCovers, fileName);
    if (fsExtra.existsSync(filePath)) {
      fsExtra.removeSync(filePath);
      console.log(`Обложка альбома удалена: ${coverUrl}`);
      res.status(200).json({ message: "Обложка успешно удалена" });
    } else {
      console.warn(`Файл не найден: ${filePath}`);
      res.status(404).json({ error: "Файл не найден" });
    }
  } catch (error) {
    console.error("Error in /delete-cover:", error.message);
    res.status(500).json({ error: error.message || "Ошибка удаления файла" });
  }
});

// Эндпоинт для прокси-запросов к Яндекс.Музыке
app.get("/proxy", async (req, res) => {
  console.log("GET /proxy received:", req.query);
  const url = req.query.url;
  if (!url || typeof url !== "string" || !url.includes("music.yandex.ru")) {
    console.error("Invalid URL in /proxy:", url);
    return res.status(400).json({ error: "Требуется корректный URL Яндекс.Музыки" });
  }

  try {
    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      Connection: "keep-alive",
      Referer: "https://music.yandex.ru/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "X-Retpath-Y": "https://music.yandex.ru/",
      "sec-ch-ua": '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
    };

    const response = await axios.get(url, { headers });
    res.json(response.data);
  } catch (error) {
    console.error("Ошибка прокси:", error.message);
    res.status(500).json({ error: "Ошибка при получении данных с Яндекс.Музыки" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Доступ по локальному адресу: http://localhost:${PORT}`);
  console.log(`Для доступа с других устройств в сети используйте IP-адрес этого компьютера`);
  console.log(`Например: http://192.168.x.x:${PORT} (где x.x - ваш локальный IP)`);
});
