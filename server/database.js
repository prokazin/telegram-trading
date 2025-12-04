const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        // Используем файловую БД для продакшена, память для разработки
        const dbPath = process.env.NODE_ENV === 'production' 
            ? path.join(__dirname, 'data', 'trading.db')
            : ':memory:';
        
        // Создаем папку data если её нет
        if (process.env.NODE_ENV === 'production') {
            const dataDir = path.join(__dirname, 'data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
        }
        
        this.db = new sqlite3.Database(dbPath);
    }

    initDatabase() {
        return new Promise((resolve, reject) => {
            // Таблица игроков
            this.db.run(`
                CREATE TABLE IF NOT EXISTS players (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telegram_id TEXT UNIQUE NOT NULL,
                    username TEXT,
                    total_profit REAL DEFAULT 0,
                    total_trades INTEGER DEFAULT 0,
                    winning_trades INTEGER DEFAULT 0,
                    losing_trades INTEGER DEFAULT 0,
                    best_trade REAL DEFAULT 0,
                    worst_trade REAL DEFAULT 0,
                    balance REAL DEFAULT 1000,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Таблица сделок
            this.db.run(`
                CREATE TABLE IF NOT EXISTS trades (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    player_id INTEGER,
                    telegram_id TEXT,
                    coin TEXT,
                    trade_type TEXT,
                    entry_price REAL,
                    exit_price REAL,
                    amount REAL,
                    leverage INTEGER,
                    profit REAL,
                    profit_percentage REAL,
                    stop_loss REAL,
                    take_profit REAL,
                    liquidated BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (player_id) REFERENCES players (id)
                )
            `, (err) => {
                if (err) reject(err);
            });

            // Индексы для быстрого поиска
            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_players_total_profit 
                ON players(total_profit DESC)
            `);

            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_trades_player_id 
                ON trades(player_id)
            `);

            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_trades_created_at 
                ON trades(created_at DESC)
            `);

            console.log('✅ База данных инициализирована');
            resolve();
        });
    }

    // Получение рейтинга
    getRanking(limit = 100, offset = 0) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    RANK() OVER (ORDER BY total_profit DESC) as rank,
                    telegram_id,
                    username,
                    total_profit,
                    total_trades,
                    winning_trades,
                    losing_trades,
                    ROUND((winning_trades * 100.0 / total_trades), 2) as win_rate,
                    best_trade,
                    worst_trade,
                    balance,
                    created_at
                FROM players
                WHERE total_trades > 0
                ORDER BY total_profit DESC
                LIMIT ? OFFSET ?
            `;
            
            this.db.all(sql, [limit, offset], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Получение игрока
    getPlayer(telegramId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    telegram_id,
                    username,
                    total_profit,
                    total_trades,
                    winning_trades,
                    losing_trades,
                    ROUND((winning_trades * 100.0 / total_trades), 2) as win_rate,
                    best_trade,
                    worst_trade,
                    balance,
                    created_at,
                    updated_at
                FROM players
                WHERE telegram_id = ?
            `;
            
            this.db.get(sql, [telegramId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    // Обновление рейтинга игрока
    updatePlayerRanking({ telegramId, username, profit, tradeDetails = {} }) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Начинаем транзакцию
                this.db.run('BEGIN TRANSACTION');
                
                // Получаем текущие данные игрока
                this.db.get(
                    'SELECT * FROM players WHERE telegram_id = ?',
                    [telegramId],
                    (err, player) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(err);
                        }
                        
                        if (!player) {
                            // Создаем нового игрока
                            const newPlayer = {
                                telegram_id: telegramId,
                                username: username,
                                total_profit: profit,
                                total_trades: 1,
                                winning_trades: profit > 0 ? 1 : 0,
                                losing_trades: profit <= 0 ? 1 : 0,
                                best_trade: profit > 0 ? profit : 0,
                                worst_trade: profit <= 0 ? profit : 0,
                                balance: 1000 + profit // Начальный баланс + прибыль
                            };
                            
                            this.db.run(
                                `INSERT INTO players (
                                    telegram_id, username, total_profit, total_trades,
                                    winning_trades, losing_trades, best_trade, worst_trade, balance
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    newPlayer.telegram_id,
                                    newPlayer.username,
                                    newPlayer.total_profit,
                                    newPlayer.total_trades,
                                    newPlayer.winning_trades,
                                    newPlayer.losing_trades,
                                    newPlayer.best_trade,
                                    newPlayer.worst_trade,
                                    newPlayer.balance
                                ],
                                function(err) {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        return reject(err);
                                    }
                                    
                                    const playerId = this.lastID;
                                    
                                    // Сохраняем сделку
                                    this.db.run(
                                        `INSERT INTO trades (
                                            player_id, telegram_id, coin, trade_type,
                                            entry_price, exit_price, amount, leverage,
                                            profit, profit_percentage, stop_loss,
                                            take_profit, liquidated
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                        [
                                            playerId,
                                            telegramId,
                                            tradeDetails.coin || 'BTC',
                                            tradeDetails.type || 'LONG',
                                            tradeDetails.entryPrice || 0,
                                            tradeDetails.exitPrice || 0,
                                            tradeDetails.amount || 0,
                                            tradeDetails.leverage || 1,
                                            profit,
                                            tradeDetails.profitPercentage || 0,
                                            tradeDetails.stopLoss || null,
                                            tradeDetails.takeProfit || null,
                                            tradeDetails.liquidated || false
                                        ],
                                        (err) => {
                                            if (err) {
                                                this.db.run('ROLLBACK');
                                                return reject(err);
                                            }
                                            
                                            this.db.run('COMMIT');
                                            resolve({
                                                telegram_id: telegramId,
                                                username: username,
                                                total_profit: newPlayer.total_profit,
                                                rank: 1 // Будет рассчитан позже
                                            });
                                        }
                                    );
                                }
                            );
                        } else {
                            // Обновляем существующего игрока
                            const updatedPlayer = {
                                total_profit: player.total_profit + profit,
                                total_trades: player.total_trades + 1,
                                winning_trades: player.winning_trades + (profit > 0 ? 1 : 0),
                                losing_trades: player.losing_trades + (profit <= 0 ? 1 : 0),
                                best_trade: Math.max(player.best_trade, profit),
                                worst_trade: Math.min(player.worst_trade, profit),
                                balance: player.balance + profit
                            };
                            
                            this.db.run(
                                `UPDATE players SET
                                    total_profit = ?,
                                    total_trades = ?,
                                    winning_trades = ?,
                                    losing_trades = ?,
                                    best_trade = ?,
                                    worst_trade = ?,
                                    balance = ?,
                                    updated_at = CURRENT_TIMESTAMP
                                WHERE telegram_id = ?`,
                                [
                                    updatedPlayer.total_profit,
                                    updatedPlayer.total_trades,
                                    updatedPlayer.winning_trades,
                                    updatedPlayer.losing_trades,
                                    updatedPlayer.best_trade,
                                    updatedPlayer.worst_trade,
                                    updatedPlayer.balance,
                                    telegramId
                                ],
                                (err) => {
                                    if (err) {
                                        this.db.run('ROLLBACK');
                                        return reject(err);
                                    }
                                    
                                    // Сохраняем сделку
                                    this.db.run(
                                        `INSERT INTO trades (
                                            player_id, telegram_id, coin, trade_type,
                                            entry_price, exit_price, amount, leverage,
                                            profit, profit_percentage, stop_loss,
                                            take_profit, liquidated
                                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                        [
                                            player.id,
                                            telegramId,
                                            tradeDetails.coin || 'BTC',
                                            tradeDetails.type || 'LONG',
                                            tradeDetails.entryPrice || 0,
                                            tradeDetails.exitPrice || 0,
                                            tradeDetails.amount || 0,
                                            tradeDetails.leverage || 1,
                                            profit,
                                            tradeDetails.profitPercentage || 0,
                                            tradeDetails.stopLoss || null,
                                            tradeDetails.takeProfit || null,
                                            tradeDetails.liquidated || false
                                        ],
                                        (err) => {
                                            if (err) {
                                                this.db.run('ROLLBACK');
                                                return reject(err);
                                            }
                                            
                                            this.db.run('COMMIT');
                                            resolve({
                                                telegram_id: telegramId,
                                                username: player.username,
                                                total_profit: updatedPlayer.total_profit,
                                                rank: null // Будет рассчитан при запросе рейтинга
                                            });
                                        }
                                    );
                                }
                            );
                        }
                    }
                );
            });
        });
    }

    // Получение статистики
    getStats() {
        return new Promise((resolve, reject) => {
            const stats = {};
            
            // Общая статистика
            this.db.get(`
                SELECT 
                    COUNT(*) as total_players,
                    SUM(total_trades) as total_trades,
                    AVG(total_profit) as avg_profit,
                    AVG(total_trades) as avg_trades_per_player,
                    SUM(CASE WHEN total_profit > 0 THEN 1 ELSE 0 END) as profitable_players,
                    SUM(CASE WHEN total_profit <= 0 THEN 1 ELSE 0 END) as losing_players
                FROM players
            `, (err, row) => {
                if (err) reject(err);
                else {
                    stats.general = row;
                    
                    // Топ 3 игрока
                    this.db.all(`
                        SELECT username, total_profit 
                        FROM players 
                        ORDER BY total_profit DESC 
                        LIMIT 3
                    `, (err, topPlayers) => {
                        if (err) reject(err);
                        else {
                            stats.topPlayers = topPlayers;
                            
                            // Статистика за последние 24 часа
                            this.db.get(`
                                SELECT 
                                    COUNT(*) as trades_last_24h,
                                    SUM(profit) as profit_last_24h,
                                    AVG(profit) as avg_profit_last_24h
                                FROM trades 
                                WHERE created_at >= datetime('now', '-1 day')
                            `, (err, last24h) => {
                                if (err) reject(err);
                                else {
                                    stats.last24h = last24h;
                                    resolve(stats);
                                }
                            });
                        }
                    });
                }
            });
        });
    }

    // Сброс рейтинга
    resetRanking() {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM trades', (err) => {
                if (err) reject(err);
                else {
                    this.db.run('DELETE FROM players', (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                }
            });
        });
    }

    // Закрытие БД
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
}

module.exports = new Database();
