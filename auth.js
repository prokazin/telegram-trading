// Telegram авторизация
let currentUser = null;
let isAdmin = false;

// Инициализация Telegram Web App
function initTelegramAuth() {
    if (window.Telegram && Telegram.WebApp) {
        // Расширяем на весь экран
        Telegram.WebApp.expand();
        
        // Получаем данные пользователя
        const user = Telegram.WebApp.initDataUnsafe.user;
        
        if (user) {
            currentUser = {
                id: user.id,
                username: user.username || `user_${user.id}`,
                firstName: user.first_name,
                lastName: user.last_name,
                isPremium: user.is_premium || false
            };
            
            // Проверяем админские права (здесь можно добавить список админов)
            const adminIds = [1499853097]; // ID админов
            isAdmin = adminIds.includes(user.id);
            
            // Сохраняем в localStorage
            localStorage.setItem('telegram_user', JSON.stringify(currentUser));
            localStorage.setItem('is_admin', isAdmin);
            
            updateUserInterface();
            
            // Загружаем данные пользователя
            loadUserData();
        } else {
            // Если не в Telegram, используем гостевой доступ
            setupGuestAccess();
        }
        
        // Настраиваем основную кнопку
        Telegram.WebApp.MainButton.setText('Открыть меню');
        Telegram.WebApp.MainButton.onClick(() => {
            Telegram.WebApp.openLink('https://t.me/your_bot');
        });
        Telegram.WebApp.MainButton.show();
        
    } else {
        setupGuestAccess();
    }
}

// Гостевой доступ
function setupGuestAccess() {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
        guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('guest_id', guestId);
    }
    
    currentUser = {
        id: guestId,
        username: 'Гость',
        isGuest: true
    };
    
    updateUserInterface();
    loadUserData();
}

// Обновление интерфейса пользователя
function updateUserInterface() {
    if (!currentUser) return;
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = currentUser.username;
    }
    
    // Показываем админ кнопку
    const adminButton = document.getElementById('adminButton');
    if (adminButton) {
        adminButton.style.display = isAdmin ? 'block' : 'none';
    }
    
    // Обновляем баланс
    updateBalanceDisplay();
}

// Загрузка данных пользователя
function loadUserData() {
    const userId = currentUser.id;
    
    // Проверяем localStorage
    let userData = localStorage.getItem(`user_${userId}`);
    
    if (userData) {
        userData = JSON.parse(userData);
    } else {
        // Создаем нового пользователя
        userData = {
            userId: userId,
            username: currentUser.username,
            balance: 1000,
            stars: 0,
            trades: [],
            history: [],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
    }
    
    // Обновляем последний логин
    userData.lastLogin = new Date().toISOString();
    localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
    
    return userData;
}

// Сохранение данных пользователя
function saveUserData(userData) {
    if (!currentUser) return;
    
    localStorage.setItem(`user_${currentUser.id}`, JSON.stringify(userData));
    updateBalanceDisplay();
}

// Получение данных пользователя
function getUserData() {
    if (!currentUser) return null;
    
    const data = localStorage.getItem(`user_${currentUser.id}`);
    return data ? JSON.parse(data) : null;
}

// Обновление отображения баланса
function updateBalanceDisplay() {
    const userData = getUserData();
    if (!userData) return;
    
    const balanceElement = document.getElementById('balanceAmount');
    if (balanceElement) {
        balanceElement.textContent = `$${userData.balance.toFixed(2)}`;
    }
    
    const starsElement = document.getElementById('userStars');
    if (starsElement) {
        starsElement.textContent = `${userData.stars} ⭐`;
    }
}

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initTelegramAuth();
    
    // Инициализация свайпера
    initSwiper();
});

// Инициализация Swiper для вертикального скролла
function initSwiper() {
    const swiper = new Swiper('.swiper-container', {
        direction: 'vertical',
        slidesPerView: 1,
        spaceBetween: 0,
        mousewheel: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
        },
        speed: 300,
        effect: 'slide',
        threshold: 10,
    });
}
