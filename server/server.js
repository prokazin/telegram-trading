const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const database = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: '*', // В продакшене укажите конкретные домены
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Инициализация БД
database.initDatabase();

// Маршруты API
app.get('/', (req, res) => {
    res.json({ 
        message: 'Трейдинг API работает!',
        endpoints: {
            ranking: '/api/ranking',
            player: '/api/player/:id',
            trade: '/api/trade',
            stats: '/api/stats'
        }
    });
});

// Получение рейтинга
app.get('/api/ranking', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const ranking = await database.getRanking(parseInt(limit), parseInt(offset));
        res.json({ success: true, ranking });
    } catch (error) {
        console.error('Ошибка получения рейтинга:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Получение данных игрока
app.get('/api/player/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const player = await database.getPlayer(telegramId);
        
        if (player) {
            res.json({ success: true, player });
        } else {
            res.status(404).json({ success: false, error: 'Игрок не найден' });
        }
    } catch (error) {
        console.error('Ошибка получения игрока:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Отправка результатов сделки
app.post('/api/trade', async (req, res) => {
    try {
        const { telegramId, username, profit, tradeDetails } = req.body;
        
        // Валидация
        if (!telegramId || profit === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Необходимы telegramId и profit' 
            });
        }
        
        // Обновление рейтинга игрока
        const player = await database.updatePlayerRanking({
            telegramId,
            username: username || `Player_${telegramId}`,
            profit,
            tradeDetails
        });
        
        res.json({ 
            success: true, 
            message: 'Результат сделки сохранен',
            player 
        });
    } catch (error) {
        console.error('Ошибка сохранения сделки:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Статистика
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await database.getStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Сброс рейтинга (только для админа)
app.post('/api/admin/reset', async (req, res) => {
    try {
        const { adminKey } = req.body;
        
        // Простая проверка админа (в продакшене используйте JWT)
        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ 
                success: false, 
                error: 'Доступ запрещен' 
            });
        }
        
        await database.resetRanking();
        res.json({ success: true, message: 'Рейтинг сброшен' });
    } catch (error) {
        console.error('Ошибка сброса рейтинга:', error);
        res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Маршрут не найден' 
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Ошибка сервера:', err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Внутренняя ошибка сервера' 
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📊 API доступно по адресу: http://localhost:${PORT}`);
});
