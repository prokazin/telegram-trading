// Этот файл будет загружаться с серверов Telegram
// Локальная версия для разработки

const Telegram = window.Telegram?.WebApp || {
    ready: () => console.log('Telegram Web App ready'),
    expand: () => console.log('Telegram Web App expanded'),
    close: () => console.log('Telegram Web App close'),
    sendData: (data) => console.log('Send data:', data),
    onEvent: (event, handler) => console.log('Event:', event),
    offEvent: (event, handler) => console.log('Off event:', event),
    initData: '',
    initDataUnsafe: {},
    version: '6.0',
    platform: 'unknown',
    colorScheme: 'light',
    themeParams: {},
    isExpanded: true,
    viewportHeight: 600,
    viewportStableHeight: 600,
    headerColor: '#667eea',
    backgroundColor: '#ffffff',
    BackButton: {
        show: () => console.log('BackButton show'),
        hide: () => console.log('BackButton hide'),
        onClick: (cb) => console.log('BackButton onClick'),
        offClick: (cb) => console.log('BackButton offClick'),
    },
    MainButton: {
        text: 'MAIN BUTTON',
        color: '#667eea',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        show: () => console.log('MainButton show'),
        hide: () => console.log('MainButton hide'),
        enable: () => console.log('MainButton enable'),
        disable: () => console.log('MainButton disable'),
        onClick: (cb) => console.log('MainButton onClick'),
        offClick: (cb) => console.log('MainButton offClick'),
    }
};

// Инициализация Telegram Web App
document.addEventListener('DOMContentLoaded', () => {
    // Расширяем на весь экран
    Telegram.expand();
    
    // Устанавливаем цвет фона
    Telegram.setBackgroundColor('#667eea');
    
    // Обработка кнопки назад
    Telegram.BackButton.show();
    Telegram.BackButton.onClick(() => {
        Telegram.close();
    });
    
    console.log('Telegram Web App initialized');
});

// Экспортируем для использования в других файлах
window.Telegram.WebApp = Telegram;
