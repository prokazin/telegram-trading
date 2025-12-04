// Основные переменные
let balance = 1000;
let pnl = 0;
let currentCoin = 'BTC';
let currentLeverage = 2;
let activeTrades = [];
let tradeHistory = [];
let playerRating = [];
let chart;
let priceHistory = {};
let currentPrices = {
    BTC: 50000,
    ETH: 3000,
    DOGE: 0.15
};
let priceUpdateInterval;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    initChart();
    updateUI();
    startPriceSimulation();
});

function initApp() {
    // Загрузка данных из localStorage
    const savedBalance = localStorage.getItem('tradingBalance');
    const savedTrades = localStorage.getItem('activeTrades');
    const savedHistory = localStorage.getItem('tradeHistory');
    
    if (savedBalance) balance = parseFloat(savedBalance);
    if (savedTrades) activeTrades = JSON.parse(savedTrades);
    if (savedHistory) tradeHistory = JSON.parse(savedHistory);
    
    // Инициализация рейтинга
    initRating();
    
    // Назначение обработчиков событий
    setupEventListeners();
    
    // Обновление активных сделок
    updateActiveTrades();
    updateHistory();
    updateRating();
}

function initChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Инициализация истории цен
    for (const coin of ['BTC', 'ETH', 'DOGE']) {
        priceHistory[coin] = generatePriceHistory(100, currentPrices[coin]);
    }
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 100}, (_, i) => i),
            datasets: [{
                label: `Цена ${currentCoin}`,
                data: priceHistory[currentCoin],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    }
                },
                x: {
                    display: false
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function setupEventListeners() {
    // Выбор монеты
    document.querySelectorAll('.coin-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.coin-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCoin = btn.dataset.coin;
            updateChart();
        });
    });
    
    // Выбор плеча
    document.querySelectorAll('.lev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.lev-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLeverage = parseInt(btn.dataset.leverage);
        });
    });
    
    // Кнопки LONG/SHORT
    document.getElementById('longBtn').addEventListener('click', () => {
        document.getElementById('longBtn').classList.add('active');
        document.getElementById('shortBtn').classList.remove('active');
    });
    
    document.getElementById('shortBtn').addEventListener('click', () => {
        document.getElementById('shortBtn').classList.add('active');
        document.getElementById('longBtn').classList.remove('active');
    });
    
    // Кнопка MAX
    document.getElementById('maxBtn').addEventListener('click', () => {
        const maxAmount = balance * currentLeverage;
        document.getElementById('amount').value = Math.floor(maxAmount);
    });
    
    // Исполнение сделки
    document.getElementById('executeTrade').addEventListener('click', openTrade);
    
    // Табы
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });
    
    // Модальное окно
    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('liquidationModal').style.display = 'none';
    });
}

function openTrade() {
    const amount = parseFloat(document.getElementById('amount').value);
    const stopLoss = parseFloat(document.getElementById('stopLoss').value);
    const takeProfit = parseFloat(document.getElementById('takeProfit').value);
    const isLong = document.getElementById('longBtn').classList.contains('active');
    
    // Валидация
    if (!amount || amount <= 0) {
        alert('Введите корректную сумму');
        return;
    }
    
    if (amount > balance * currentLeverage) {
        alert('Недостаточно средств с учетом плеча');
        return;
    }
    
    // Создание сделки
    const trade = {
        id: Date.now(),
        coin: currentCoin,
        type: isLong ? 'LONG' : 'SHORT',
        entryPrice: currentPrices[currentCoin],
        amount: amount,
        leverage: currentLeverage,
        stopLoss: stopLoss || null,
        takeProfit: takeProfit || null,
        timestamp: new Date().toISOString(),
        pnl: 0
    };
    
    activeTrades.push(trade);
    updateActiveTrades();
    saveToLocalStorage();
    
    // Очистка полей
    document.getElementById('amount').value = '';
    document.getElementById('stopLoss').value = '';
    document.getElementById('takeProfit').value = '';
}

function closeTrade(tradeId, isLiquidation = false) {
    const tradeIndex = activeTrades.findIndex(t => t.id === tradeId);
    if (tradeIndex === -1) return;
    
    const trade = activeTrades[tradeIndex];
    const exitPrice = currentPrices[trade.coin];
    
    // Расчет P&L
    let pnlPercentage;
    if (trade.type === 'LONG') {
        pnlPercentage = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
    } else {
        pnlPercentage = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
    }
    
    const pnlAmount = (trade.amount * pnlPercentage * trade.leverage) / 100;
    
    // Добавление в историю
    const historyEntry = {
        ...trade,
        exitPrice: exitPrice,
        pnlPercentage: pnlPercentage,
        pnlAmount: pnlAmount,
        exitTime: new Date().toISOString(),
        liquidated: isLiquidation
    };
    
    tradeHistory.unshift(historyEntry);
    
    // Обновление баланса
    if (!isLiquidation) {
        balance += pnlAmount;
        updateBalance();
    }
    
    // Удаление из активных сделок
    activeTrades.splice(tradeIndex, 1);
    
    updateActiveTrades();
    updateHistory();
    saveToLocalStorage();
    
    // Обновление рейтинга
    updatePlayerInRating(pnlAmount);
}

function updateActiveTrades() {
    const tradesList = document.getElementById('tradesList');
    tradesList.innerHTML = '';
    
    activeTrades.forEach(trade => {
        const currentPrice = currentPrices[trade.coin];
        let pnlPercentage;
        
        if (trade.type === 'LONG') {
            pnlPercentage = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
        } else {
            pnlPercentage = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
        }
        
        const pnlAmount = (trade.amount * pnlPercentage * trade.leverage) / 100;
        trade.pnl = pnlAmount;
        
        const tradeElement = document.createElement('div');
        tradeElement.className = `trade-item ${trade.type.toLowerCase()}`;
        tradeElement.innerHTML = `
            <div class="trade-info">
                <div class="trade-header">
                    <strong>${trade.coin} ${trade.type}</strong>
                    <span>${trade.leverage}x</span>
                </div>
                <div>Вход: $${trade.entryPrice.toFixed(2)}</div>
                <div>Текущая: $${currentPrice.toFixed(2)}</div>
                <div class="${pnlAmount >= 0 ? 'positive' : 'negative'}">
                    P&L: ${pnlAmount >= 0 ? '+' : ''}$${pnlAmount.toFixed(2)} (${pnlPercentage >= 0 ? '+' : ''}${pnlPercentage.toFixed(2)}%)
                </div>
            </div>
            <div class="trade-actions">
                <button class="close-btn" onclick="closeTrade(${trade.id})">Закрыть</button>
            </div>
        `;
        
        tradesList.appendChild(tradeElement);
        
        // Проверка стоп-лосс / тейк-профит
        checkTradeConditions(trade, pnlPercentage);
        
        // Проверка ликвидации
        if (Math.abs(pnlPercentage) * trade.leverage >= 100) {
            liquidateTrade(trade.id);
        }
    });
}

function checkTradeConditions(trade, pnlPercentage) {
    if (trade.stopLoss && pnlPercentage <= -trade.stopLoss) {
        closeTrade(trade.id);
        showNotification(`Стоп-лосс сработал для ${trade.coin} ${trade.type}`);
    }
    
    if (trade.takeProfit && pnlPercentage >= trade.takeProfit) {
        closeTrade(trade.id);
        showNotification(`Тейк-профит сработал для ${trade.coin} ${trade.type}`);
    }
}

function liquidateTrade(tradeId) {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;
    
    // Обнуление баланса при ликвидации
    balance = 0;
    updateBalance();
    
    closeTrade(tradeId, true);
    
    // Показать модальное окно ликвидации
    document.getElementById('liquidationMessage').textContent = 
        `Позиция ${trade.coin} ${trade.type} ликвидирована! Баланс обнулен.`;
    document.getElementById('liquidationModal').style.display = 'flex';
}

function updateHistory() {
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';
    
    const recentHistory = tradeHistory.slice(0, 10);
    
    recentHistory.forEach(entry => {
        const historyElement = document.createElement('div');
        historyElement.className = `history-item ${entry.pnlAmount >= 0 ? 'positive' : 'negative'}`;
        historyElement.innerHTML = `
            <div>
                <strong>${entry.coin} ${entry.type}</strong>
                <div>${new Date(entry.timestamp).toLocaleString()}</div>
            </div>
            <div class="${entry.pnlAmount >= 0 ? 'positive' : 'negative'}">
                ${entry.pnlAmount >= 0 ? '+' : ''}$${entry.pnlAmount.toFixed(2)}
                ${entry.liquidated ? ' (ЛИКВИДАЦИЯ)' : ''}
            </div>
        `;
        historyList.appendChild(historyElement);
    });
}

function initRating() {
    const savedRating = localStorage.getItem('playerRating');
    if (savedRating) {
        playerRating = JSON.parse(savedRating);
    } else {
        // Начальный рейтинг
        playerRating = [
            { name: 'Трейдер 1', profit: 2450.50 },
            { name: 'КриптоВолк', profit: 1890.75 },
            { name: 'Биткоин Макс', profit: 1560.20 },
            { name: 'Эфириум Про', profit: 1230.90 },
            { name: 'Доджер', profit: 890.45 }
        ];
    }
}

function updatePlayerInRating(profit) {
    // В реальном приложении здесь была бы авторизация
    // Для демо просто добавляем анонимного игрока
    const playerName = `Игрок_${Math.floor(Math.random() * 1000)}`;
    
    playerRating.push({
        name: playerName,
        profit: profit
    });
    
    // Сортировка по убыванию прибыли
    playerRating.sort((a, b) => b.profit - a.profit);
    
    // Ограничение топ-10
    playerRating = playerRating.slice(0, 10);
    
    updateRating();
    localStorage.setItem('playerRating', JSON.stringify(playerRating));
}

function updateRating() {
    const ratingList = document.getElementById('ratingList');
    ratingList.innerHTML = '';
    
    playerRating.forEach((player, index) => {
        const ratingElement = document.createElement('div');
        ratingElement.className = 'rating-item';
        ratingElement.innerHTML = `
            <div>
                <strong>${index + 1}. ${player.name}</strong>
            </div>
            <div class="${player.profit >= 0 ? 'positive' : 'negative'}">
                $${player.profit.toFixed(2)}
            </div>
        `;
        ratingList.appendChild(ratingElement);
    });
}

function updateChart() {
    chart.data.datasets[0].label = `Цена ${currentCoin}`;
    chart.data.datasets[0].data = priceHistory[currentCoin];
    chart.update();
    
    // Обновление текущей цены
    document.getElementById('currentPrice').textContent = 
        `$${currentPrices[currentCoin].toFixed(2)}`;
}

function updateUI() {
    document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    document.getElementById('currentPrice').textContent = `$${currentPrices[currentCoin].toFixed(2)}`;
    
    // Расчет общего P&L
    const totalPnl = activeTrades.reduce((sum, trade) => sum + trade.pnl, 0);
    pnl = totalPnl;
    
    const pnlElement = document.getElementById('pnl');
    pnlElement.textContent = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
    pnlElement.className = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral';
}

function updateBalance() {
    document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
    saveToLocalStorage();
}

function startPriceSimulation() {
    clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(() => {
        // Обновление цен для всех монет
        for (const coin in currentPrices) {
            const volatility = {
                BTC: 0.02,
                ETH: 0.03,
                DOGE: 0.05
            }[coin];
            
            const change = (Math.random() - 0.5) * 2 * volatility * currentPrices[coin];
            currentPrices[coin] += change;
            
            // Обновление истории цен
            priceHistory[coin].push(currentPrices[coin]);
            if (priceHistory[coin].length > 100) {
                priceHistory[coin].shift();
            }
        }
        
        // Обновление графика текущей монеты
        if (priceHistory[currentCoin]) {
            chart.data.datasets[0].data = priceHistory[currentCoin];
            chart.update();
        }
        
        // Обновление UI
        updateUI();
        
        // Обновление активных сделок
        if (activeTrades.length > 0) {
            updateActiveTrades();
        }
        
    }, 1000); // Обновление каждую секунду
}

function generatePriceHistory(count, startPrice) {
    const history = [startPrice];
    let currentPrice = startPrice;
    
    for (let i = 1; i < count; i++) {
        const change = (Math.random() - 0.5) * 0.02 * currentPrice;
        currentPrice += change;
        history.push(currentPrice);
    }
    
    return history;
}

function saveToLocalStorage() {
    localStorage.setItem('tradingBalance', balance.toString());
    localStorage.setItem('activeTrades', JSON.stringify(activeTrades));
    localStorage.setItem('tradeHistory', JSON.stringify(tradeHistory));
}

function showNotification(message) {
    // В реальном приложении можно использовать Telegram Web App уведомления
    alert(message);
}

// Функция сброса игры (для тестирования)
function resetGame() {
    if (confirm('Вы уверены? Все данные будут удалены!')) {
        balance = 1000;
        activeTrades = [];
        tradeHistory = [];
        localStorage.clear();
        updateUI();
        updateActiveTrades();
        updateHistory();
        alert('Игра сброшена! Начальный баланс: $1000');
    }
}
