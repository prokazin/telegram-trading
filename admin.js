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
        return new Date(b.data.lastLogin || b.data
