// Обработка платежей через Telegram Stars
let selectedStars = 0;
let selectedDollars = 0;

// Открытие меню покупки
function openBuyMenu() {
    const buyMenu = document.getElementById('buyMenu');
    buyMenu.style.display = 'flex';
    
    // Сброс выбора
    selectedStars = 0;
    selectedDollars = 0;
    updateSelectedPackage();
}

// Закрытие меню покупки
function closeBuyMenu() {
    document.getElementById('buyMenu').style.display = 'none';
}

// Выбор пакета
function selectPackage(stars, dollars) {
    selectedStars = stars;
    selectedDollars = dollars;
    updateSelectedPackage();
}

// Обновление отображения выбранного пакета
function updateSelectedPackage() {
    const selectedElement = document.getElementById('selectedAmount');
    const starsCountElement = document.getElementById('starsCount');
    
    if (selectedElement) {
        selectedElement.textContent = `${selectedStars} ⭐ = $${selectedDollars}`;
    }
    
    if (starsCountElement) {
        starsCountElement.textContent = selectedStars;
    }
}

// Обработка платежа Stars
function processStarsPayment() {
    if (selectedStars <= 0) {
        alert('Выберите пакет для покупки');
        return;
    }
    
    if (!currentUser) {
        alert('Требуется авторизация');
        return;
    }
    
    // Проверяем, в Telegram ли мы
    if (window.Telegram && Telegram.WebApp) {
        // Используем Telegram Stars API
        processTelegramStarsPayment();
    } else {
        // Для веб-версии - имитация платежа
        processWebPayment();
    }
}

// Платеж через Telegram Stars
function processTelegramStarsPayment() {
    // Здесь должен быть реальный запрос к Telegram Stars API
    // Для демо используем имитацию
    
    showPaymentProcessing();
    
    // Имитация обработки платежа
    setTimeout(() => {
        completeStarsPurchase();
    }, 2000);
}

// Имитация платежа для веб-версии
function processWebPayment() {
    const userData = getUserData();
    
    if (userData.stars >= selectedStars) {
        // Используем существующие Stars
        userData.stars -= selectedStars;
        userData.balance += selectedDollars;
        
        saveUserData(userData);
        showPaymentSuccess();
    } else {
        // Показываем сообщение о недостатке Stars
        alert(`Недостаточно Stars. У вас: ${userData.stars} ⭐, требуется: ${selectedStars} ⭐`);
        
        // Предлагаем получить Stars
        if (confirm('Хотите получить тестовые Stars для демо?')) {
            userData.stars += 1000;
            saveUserData(userData);
            alert('Добавлено 1000 ⭐ для тестирования!');
            closeBuyMenu();
        }
    }
}

// Показ процесса оплаты
function showPaymentProcessing() {
    const confirmBtn = document.querySelector('.confirm-btn');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.innerHTML = 'Обработка...';
    confirmBtn.disabled = true;
    
    setTimeout(() => {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }, 2000);
}

// Успешная покупка
function completeStarsPurchase() {
    const userData = getUserData();
    
    // Добавляем бонус (10% от суммы)
    const bonus = selectedDollars * 0.1;
    const totalAmount = selectedDollars + bonus;
    
    userData.balance += totalAmount;
    
    // Добавляем историю покупки
    userData.purchases = userData.purchases || [];
    userData.purchases.push({
        stars: selectedStars,
        dollars: selectedDollars,
        bonus: bonus,
        total: totalAmount,
        date: new Date().toISOString()
    });
    
    saveUserData(userData);
    
    // Показываем успешное сообщение
    showPaymentSuccess();
}

// Отображение успешной оплаты
function showPaymentSuccess() {
    closeBuyMenu();
    
    // Показываем уведомление
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">✅</div>
            <div class="notification-text">
                <h3>Пополнение успешно!</h3>
                <p>На ваш баланс зачислено $${selectedDollars}</p>
                <p>Баланс: $${getUserData().balance.toFixed(2)}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Функция для админов: добавить Stars пользователю
function addStarsToUser(userId, stars) {
    const userData = localStorage.getItem(`user_${userId}`);
    if (userData) {
        const data = JSON.parse(userData);
        data.stars = (data.stars || 0) + stars;
        localStorage.setItem(`user_${userId}`, JSON.stringify(data));
        return true;
    }
    return false;
}

// Быстрая покупка из главного меню
function buyPackage(stars, dollars) {
    selectedStars = stars;
    selectedDollars = dollars;
    processStarsPayment();
}
