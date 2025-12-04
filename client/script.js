// Добавьте эти переменные в начало файла
const API_BASE_URL = 'https://your-server.onrender.com'; // Замените на ваш URL
let telegramUser = null;

// В функции initApp добавьте:
async function initApp() {
    // ... существующий код ...
    
    // Получаем данные Telegram пользователя
    await initTelegramUser();
    
    // Загружаем глобальный рейтинг
    await loadGlobalRanking();
    
    // ... остальной код ...
}

// Новая функция для инициализации Telegram пользователя
async function initTelegramUser() {
    try {
        // Пытаемся получить данные из Telegram Web App
        if (window.Telegram && Telegram.WebApp) {
            const initData = Telegram.WebApp.initDataUnsafe;
            
            if (initData.user) {
                telegramUser = {
                    id: initData.user.id,
                    username: initData.user.username || `User_${initData.user.id}`,
                    firstName: initData.user.first_name,
                    lastName: initData.user.last_name
                };
                
                console.log('Telegram user detected:', telegramUser);
                
                // Загружаем данные игрока с сервера
                await loadPlayerData(telegramUser.id);
            }
        }
        
        // Если не в Telegram, используем localStorage ID
        if (!telegramUser) {
            let userId = localStorage.getItem('userId');
            if (!userId) {
                userId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                localStorage.setItem('userId', userId);
            }
            
            telegramUser = {
                id: userId,
                username: `WebPlayer_${userId.substr(-6)}`
            };
        }
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

// Загрузка данных игрока
async function loadPlayerData(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/player/${userId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.player) {
                // Обновляем баланс из БД, если он есть
                if (data.player.balance) {
                    balance = data.player.balance;
                    updateBalance();
                }
            }
        }
    } catch (error) {
        console.error('Error loading player data:', error);
    }
}

// Загрузка глобального рейтинга
async function loadGlobalRanking() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ranking?limit=10`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                playerRating = data.ranking.map(player => ({
                    name: player.username || `Игрок ${player.rank}`,
                    profit: player.total_profit
                }));
                updateRating();
            }
        }
    } catch (error) {
        console.error('Error loading ranking:', error);
    }
}

// Обновленная функция closeTrade - отправка на сервер
async function closeTrade(tradeId, isLiquidation = false) {
    // ... существующий код расчета P&L ...
    
    // После расчета P&L, отправляем на сервер
    if (telegramUser) {
        try {
            const trade = activeTrades.find(t => t.id === tradeId);
            
            const tradeData = {
                telegramId: telegramUser.id,
                username: telegramUser.username,
                profit: pnlAmount,
                tradeDetails: {
                    coin: trade.coin,
                    type: trade.type,
                    entryPrice: trade.entryPrice,
                    exitPrice: currentPrices[trade.coin],
                    amount: trade.amount,
                    leverage: trade.leverage,
                    profitPercentage: pnlPercentage,
                    stopLoss: trade.stopLoss,
                    takeProfit: trade.takeProfit,
                    liquidated: isLiquidation
                }
            };
            
            await sendTradeToServer(tradeData);
            
            // Обновляем рейтинг после отправки
            await loadGlobalRanking();
            
        } catch (error) {
            console.error('Error sending trade to server:', error);
        }
    }
    
    // ... остальной существующий код ...
}

// Функция отправки сделки на сервер
async function sendTradeToServer(tradeData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/trade`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(tradeData)
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('Trade saved to server:', data);
        } else {
            console.error('Server error:', data.error);
        }
    } catch (error) {
        console.error('Error sending trade:', error);
    }
}

// Обновленная функция updateRating - использует данные с сервера
function updateRating() {
    const ratingList = document.getElementById('ratingList');
    if (!ratingList) return;
    
    ratingList.innerHTML = '';
    
    playerRating.forEach((player, index) => {
        const ratingElement = document.createElement('div');
        ratingElement.className = 'rating-item';
        ratingElement.innerHTML = `
            <div>
                <strong>${index + 1}. ${player.name}</strong>
                ${player.total_trades ? `<div class="small-text">Сделок: ${player.total_trades}</div>` : ''}
            </div>
            <div class="${player.profit >= 0 ? 'positive' : 'negative'}">
                $${player.profit.toFixed(2)}
            </div>
        `;
        ratingList.appendChild(ratingElement);
    });
}

// Добавьте этот CSS в style.css
.small-text {
    font-size: 12px;
    color: #666;
    margin-top: 2px;
}
