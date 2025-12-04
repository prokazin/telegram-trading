// Админ-панель
let allUsers = [];
let currentEditingUserId = null;

// Проверка прав администратора
function checkAdminAccess() {
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (!isAdmin) {
        // Редирект на главную, если не админ
        window.location.href = 'index.html';
        return false;
    }
    
    // Обновляем имя админа
    const userData = JSON.parse(localStorage.getItem('telegram_user') || '{}');
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement && userData.username) {
        adminNameElement.textContent = userData.username;
    }
    
    return true;
}

// Загрузка всех пользователей
function loadAllUsers() {
    allUsers = [];
    
    // Проходим по всем ключам localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Ищем пользователей
        if (key.startsWith('user_')) {
            try {
                const userData = JSON.parse(localStorage.getItem(key));
                const userId = key.replace('user_', '');
                
                allUsers.push({
                    id: userId,
                    data: userData
                });
            } catch (e) {
                console.error('Error parsing user data:', key, e);
            }
        }
    }
    
    // Сортируем по дате последнего входа
    allUsers.sort((a, b) => {
        return new Date(b.data.lastLogin || b.data.createdAt) - 
               new Date(a.data.lastLogin || a.data.createdAt);
    });
    
    return allUsers;
}

// Отображение списка пользователей
function displayUsers(users = allUsers) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="empty">Пользователи не найдены</div>';
        return;
    }
    
    let html = '';
    
    users.forEach(user => {
        const userData = user.data;
        const isActive = !userData.banned;
        const lastLogin = userData.lastLogin ? 
            new Date(userData.lastLogin).toLocaleString() : 'Никогда';
        
        html += `
            <div class="user-item ${isActive ? '' : 'banned'}" onclick="openUserModal('${user.id}')">
                <div class="user-avatar">
                    ${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="user-info">
                    <div class="user-name">${userData.username || 'Без имени'}</div>
                    <div class="user-id">ID: ${user.id}</div>
                    <div class="user-stats">
                        <span class="stat">Баланс: $${userData.balance?.toFixed(2) || '0'}</span>
                        <span class="stat">Stars: ${userData.stars || 0} ⭐</span>
                        <span class="stat">Сделок: ${userData.trades?.length || 0}</span>
                    </div>
                </div>
                <div class="user-status">
                    <span class="status-badge ${isActive ? 'active' : 'banned'}">
                        ${isActive ? 'Активен' : 'Забанен'}
                    </span>
                    <div class="last-login">${lastLogin}</div>
                </div>
            </div>
        `;
    });
    
    usersList.innerHTML = html;
}

// Открытие модального окна пользователя
function openUserModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    const userData = user.data;
    currentEditingUserId = userId;
    
    // Заполняем информацию
    document.getElementById('modalUserId').textContent = userId;
    document.getElementById('modalUserName').textContent = userData.username || 'Без имени';
    document.getElementById('modalUserBalance').textContent = `$${userData.balance?.toFixed(2) || '0'}`;
    document.getElementById('modalUserStars').textContent = `${userData.stars || 0} ⭐`;
    
    // Заполняем поля редактирования
    document.getElementById('editBalance').value = userData.balance || 0;
    document.getElementById('editStars').value = userData.stars || 0;
    document.getElementById('editStatus').value = userData.banned ? 'banned' : 'active';
    
    // Показываем модальное окно
    document.getElementById('userModal').style.display = 'flex';
}

// Закрытие модального окна пользователя
function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
    currentEditingUserId = null;
}

// Сохранение изменений пользователя
function saveUserChanges() {
    if (!currentEditingUserId) return;
    
    const newBalance = parseFloat(document.getElementById('editBalance').value) || 0;
    const newStars = parseInt(document.getElementById('editStars').value) || 0;
    const newStatus = document.getElementById('editStatus').value;
    
    // Находим пользователя
    const userIndex = allUsers.findIndex(u => u.id === currentEditingUserId);
    if (userIndex === -1) return;
    
    const userData = allUsers[userIndex].data;
    
    // Обновляем данные
    userData.balance = newBalance;
    userData.stars = newStars;
    userData.banned = newStatus === 'banned';
    userData.updatedAt = new Date().toISOString();
    
    // Сохраняем в localStorage
    localStorage.setItem(`user_${currentEditingUserId}`, JSON.stringify(userData));
    
    // Обновляем список
    loadAllUsers();
    displayUsers();
    
    // Закрываем модальное окно
    closeUserModal();
    
    // Показываем уведомление
    showNotification('Изменения сохранены успешно!');
}

// Удаление пользователя
function deleteUser() {
    if (!currentEditingUserId || !confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    localStorage.removeItem(`user_${currentEditingUserId}`);
    
    // Обновляем список
    loadAllUsers();
    displayUsers();
    
    closeUserModal();
    showNotification('Пользователь удален');
}

// Добавление тестового пользователя
function addTestUser() {
    const testId = 'test_' + Date.now();
    const testData = {
        userId: testId,
        username: 'Тестовый пользователь',
        balance: 1000,
        stars: 100,
        trades: [],
        history: [],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
    };
    
    localStorage.setItem(`user_${testId}`, JSON.stringify(testData));
    
    // Обновляем список
    loadAllUsers();
    displayUsers();
    
    showNotification('Тестовый пользователь добавлен');
}

// Очистка всех пользователей
function clearAllUsers() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕХ пользователей. Продолжить?')) {
        return;
    }
    
    const keysToRemove = [];
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('user_') && !key.includes('guest_')) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    loadAllUsers();
    displayUsers();
    
    showNotification('Все пользователи удалены');
}

// Загрузка статистики
function loadStats() {
    const users = loadAllUsers();
    
    // Общая статистика
    document.getElementById('totalUsers').textContent = users.length;
    
    const activeTraders = users.filter(u => u.data.trades && u.data.trades.length > 0).length;
    document.getElementById('activeTraders').textContent = activeTraders;
    
    const totalBalance = users.reduce((sum, u) => sum + (u.data.balance || 0), 0);
    document.getElementById('totalBalance').textContent = `$${totalBalance.toFixed(2)}`;
    
    const totalPnl = users.reduce((sum, u) => {
        const trades = u.data.trades || [];
        const pnl = trades.reduce((tradeSum, trade) => tradeSum + (trade.profit || 0), 0);
        return sum + pnl;
    }, 0);
    document.getElementById('totalPnl').textContent = `$${totalPnl.toFixed(2)}`;
}

// Обновление статистики
function updateStats() {
    loadStats();
    
    // Здесь можно добавить обновление графиков
    updateCharts();
}

// Обновление графиков
function updateCharts() {
    // Регистрации по дням
    const registrationsByDay = {};
    allUsers.forEach(user => {
        const date = user.data.createdAt.split('T')[0];
        registrationsByDay[date] = (registrationsByDay[date] || 0) + 1;
    });
    
    // Пополнения по дням
    const depositsByDay = {};
    allUsers.forEach(user => {
        const purchases = user.data.purchases || [];
        purchases.forEach(purchase => {
            const date = purchase.date.split('T')[0];
            depositsByDay[date] = (depositsByDay[date] || 0) + purchase.total;
        });
    });
    
    // Создаем графики (используем Chart.js)
    createChart('registrationsChart', Object.keys(registrationsByDay), Object.values(registrationsByDay), 'Регистрации');
    createChart('depositsChart', Object.keys(depositsByDay), Object.values(depositsByDay), 'Пополнения ($)');
}

// Создание графика
function createChart(canvasId, labels, data, label) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    // Если уже существует график - уничтожаем
    if (ctx.chart) {
        ctx.chart.destroy();
    }
    
    ctx.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Загрузка платежей
function loadPayments() {
    const payments = [];
    
    allUsers.forEach(user => {
        const userPurchases = user.data.purchases || [];
        userPurchases.forEach(purchase => {
            payments.push({
                userId: user.id,
                username: user.data.username,
                stars: purchase.stars,
                amount: purchase.total,
                date: purchase.date
            });
        });
    });
    
    // Сортируем по дате
    payments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Обновляем статистику платежей
    const totalPayments = payments.length;
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgPayment = totalPayments > 0 ? totalAmount / totalPayments : 0;
    
    document.getElementById('totalPayments').textContent = totalPayments;
    document.getElementById('totalAmount').textContent = `$${totalAmount.toFixed(2)}`;
    document.getElementById('avgPayment').textContent = `$${avgPayment.toFixed(2)}`;
    
    // Отображаем платежи
    displayPayments(payments);
}

// Отображение платежей
function displayPayments(payments) {
    const paymentsList = document.getElementById('paymentsList');
    if (!paymentsList) return;
    
    if (payments.length === 0) {
        paymentsList.innerHTML = '<div class="empty">Платежей не найдено</div>';
        return;
    }
    
    let html = '';
    
    payments.forEach(payment => {
        const date = new Date(payment.date).toLocaleString();
        
        html += `
            <div class="payment-item">
                <div class="payment-header">
                    <span class="payment-user">${payment.username || 'Без имени'}</span>
                    <span class="payment-date">${date}</span>
                </div>
                <div class="payment-details">
                    <span class="payment-stars">${payment.stars} ⭐</span>
                    <span class="payment-amount">$${payment.amount.toFixed(2)}</span>
                    <span class="payment-id">ID: ${payment.userId}</span>
                </div>
            </div>
        `;
    });
    
    paymentsList.innerHTML = html;
}

// Сохранение настроек
function saveSettings() {
    const settings = {
        startBalance: parseFloat(document.getElementById('startBalance').value) || 1000,
        maxLeverage: parseInt(document.getElementById('maxLeverage').value) || 10,
        withdrawFee: parseFloat(document.getElementById('withdrawFee').value) || 5,
        starsRate: parseFloat(document.getElementById('starsRate').value) || 0.01,
        firstBonus: parseFloat(document.getElementById('firstBonus').value) || 10
    };
    
    localStorage.setItem('trading_settings', JSON.stringify(settings));
    showNotification('Настройки сохранены!');
}

// Загрузка настроек
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('trading_settings') || '{}');
    
    document.getElementById('startBalance').value = settings.startBalance || 1000;
    document.getElementById('maxLeverage').value = settings.maxLeverage || 10;
    document.getElementById('withdrawFee').value = settings.withdrawFee || 5;
    document.getElementById('starsRate').value = settings.starsRate || 0.01;
    document.getElementById('firstBonus').value = settings.firstBonus || 10;
}

// Сброс настроек
function resetSettings() {
    if (confirm('Сбросить все настройки к значениям по умолчанию?')) {
        localStorage.removeItem('trading_settings');
        loadSettings();
        showNotification('Настройки сброшены');
    }
}

// Сброс всех данных
function resetAllData() {
    if (!confirm('ВНИМАНИЕ! Это удалит ВСЕ данные приложения. Продолжить?')) {
        return;
    }
    
    localStorage.clear();
    showNotification('Все данные сброшены');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// Экспорт данных
function exportData() {
    const data = {};
    
    // Собираем все данные из localStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
            data[key] = JSON.parse(localStorage.getItem(key));
        } catch (e) {
            data[key] = localStorage.getItem(key);
        }
    }
    
    // Создаем файл для скачивания
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `trading_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Импорт данных
function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!confirm(`Будет импортировано ${Object.keys(data).length} записей. Продолжить?`)) {
                    return;
                }
                
                // Очищаем существующие данные
                localStorage.clear();
                
                // Импортируем новые данные
                Object.keys(data).forEach(key => {
                    if (typeof data[key] === 'object') {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    } else {
                        localStorage.setItem(key, data[key]);
                    }
                });
                
                showNotification('Данные успешно импортированы!');
                setTimeout(() => {
                    location.reload();
                }, 1000);
                
            } catch (error) {
                alert('Ошибка при импорте данных: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Показ уведомления
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Выход из админки
function logout() {
    localStorage.removeItem('is_admin');
    window.location.href = 'index.html';
}

// Инициализация админки
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdminAccess()) return;
    
    // Загружаем данные
    loadAllUsers();
    displayUsers();
    loadStats();
    loadPayments();
    loadSettings();
    
    // Настраиваем табы
    const tabs = document.querySelectorAll('.admin-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Убираем активный класс у всех табов
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс текущему табу
            this.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });
    
    // Поиск пользователей
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            if (searchTerm.trim() === '') {
                displayUsers();
                return;
            }
            
            const filteredUsers = allUsers.filter(user => {
                return user.id.toLowerCase().includes(searchTerm) || 
                       (user.data.username && user.data.username.toLowerCase().includes(searchTerm));
            });
            
            displayUsers(filteredUsers);
        });
    }
    
    // Фильтр платежей
    const paymentFilter = document.getElementById('paymentFilter');
    if (paymentFilter) {
        paymentFilter.addEventListener('change', function() {
            // Здесь можно добавить фильтрацию платежей по дате
            loadPayments();
        });
    }
});
