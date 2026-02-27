// ==UserScript==
// @name         Faceit Party Average Elo
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Считает среднее ELO всех игроков в пати (сумма ELO / количество игроков)
// @author       Gariloz
// @match        https://*.faceit.com/*
// @grant        none
// @updateURL    https://github.com/Gariloz/Faceit-Party-Average-Elo/raw/main/Faceit-Party-Average-Elo.user.js
// @downloadURL  https://github.com/Gariloz/Faceit-Party-Average-Elo/raw/main/Faceit-Party-Average-Elo.user.js
// ==/UserScript==

(function() {
    'use strict';

    // === КОНФИГУРАЦИЯ (ВСЕ НАСТРОЙКИ ЗДЕСЬ) ===
    const CONFIG = {
        // === ОБЩИЕ ТАЙМИНГИ (для производительности) ===
        UPDATE_INTERVAL: 1000,              // Как часто пересчитывать (мс). Больше = меньше нагрузка (рекомендуется 1000)
        INIT_DELAY_LOADED: 1000,            // Задержка перед первым init (мс)
        INIT_DELAY_ON_LOAD: 1000,           // Доп. задержка после window.load (мс)
        INIT_RETRY_DELAY: 500,              // Пауза между попытками найти пати (мс)
        INIT_MAX_ATTEMPTS: 30,              // Сколько попыток искать пати при старте
        DOM_OBSERVER_DEBOUNCE: 150,         // Задержка перед реакцией на DOM (мс). Меньше = быстрее на SPA

        // === ОТОБРАЖЕНИЕ БЛОКОВ ELO (вкл/выкл) ===
        SHOW_LOBBY_ELO_BLOCKS: true,        // Показывать блоки ELO под лобби в клубах (true/false)
        SHOW_MAIN_PARTY_ELO_BLOCK: true,    // Показывать блок ELO на странице matchmaking (true/false)

        // === РАЗНИЦА ELO: ПОРОГ И УВЕДОМЛЕНИЯ (все можно вкл/выкл) ===
        ELO_DIFF_WARNING_THRESHOLD: 800,     // Порог: при разнице выше — красный цвет и оповещения
        ELO_DIFF_NOTIFY_COOLDOWN_MS: 60000,  // Пауза между оповещениями (мс), чтобы не спамить
        ELO_DIFF_NOTIFY_STABILITY_MS: 2000,  // Уведомлять только если высокая разница держится N мс (избегаем фейковых)

        NOTIFY_ON_HIGH_ELO_DIFF: true,      // Браузерное уведомление (true/false) — часто не работает
        NOTIFY_SOUND_ON_HIGH_ELO_DIFF: true, // Звуковое оповещение (true/false)
        ELO_DIFF_SOUND_URL: 'https://cdn-frontend.faceit-cdn.net/web-next/_next/static/media/radio-impact-swirl.mp3',

        CUSTOM_ALERT_ON_HIGH_ELO_DIFF: true, // Текстовое оповещение на странице — баннер (true/false)
        CUSTOM_ALERT_DURATION_MS: 8000,      // Сколько мс показывать баннер (0 = пока не закроют)
        CUSTOM_ALERT: {                       // Оформление кастомного баннера
            FONT_SIZE: '28px',                // Размер текста
            MIN_WIDTH: '420px',               // Минимальная ширина
            PADDING: '28px 36px'              // Отступы
        },

        // === НАСТРОЙКИ ГЛОБАЛЬНОГО БЛОКА (сейчас почти не используется, но пусть будет в конфиге) ===
        GLOBAL_DISPLAY: {
            TOP: '140px',                   // Отступ сверху, если возвращать плавающий блок
            RIGHT: '70px',                  // Отступ справа
            Z_INDEX: '2147483647',          // Z‑index поверх всего
            PADDING: '10px 20px',           // Внутренние отступы
            BORDER_RADIUS: '5px',           // Скругление углов
            BOX_SHADOW: '0 2px 5px rgba(0, 0, 0, 0.3)', // Тень блока
            FONT_SIZE: '18px',              // Размер шрифта текста в этом блоке
            FONT_WEIGHT: 'bold'             // Жирность шрифта
        },

        // === ОФОРМЛЕНИЕ БЛОКА ПОД ЛОББИ В КЛУБАХ ===
        LOBBY_BLOCK: {
            // Общий стиль контейнера
            BACKGROUND: 'rgba(0, 0, 0, 0.8)', // Цвет фона блока
            TEXT_COLOR: '#fff',               // Основной цвет текста
            BORDER_RADIUS: '4px',             // Скругление краёв блока
            PADDING: '6px 8px',               // Отступы внутри блока
            BORDER_COLOR: 'rgba(255,255,255,0.2)', // Цвет «линий» сверху/снизу
            FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", // Шрифт

            // Строка: "Среднее ELO лобби"
            TITLE_FONT_SIZE: '12px',          // Размер надписи "Среднее ELO лобби"

            // Строка с обычным средним: "611 (2 игроков)"
            // ЭТО КЛЮЧЕВОЙ ПАРАМЕТР для увеличения числа "611"
            VALUE_FONT_SIZE: '20px',          // Размер числа 611
            VALUE_FONT_WEIGHT: '700',         // Жирность числа 611
            VALUE_PLAYERS_FONT_SIZE: '10px',  // Размер текста "(2 игроков)" под числом 611

            // Строка "+100"
            // Этой строкой выводится отдельная строка с подписью "+100"
            PLUS_LABEL_FONT_SIZE: '12px',     // Размер надписи "+100"

            // Строка с ELO по правилу +100: "711 (2 игроков)"
            // ЭТО КЛЮЧЕВОЙ ПАРАМЕТР для увеличения числа "711"
            PLUS_VALUE_FONT_SIZE: '20px',     // Размер числа 711
            PLUS_VALUE_PLAYERS_FONT_SIZE: '10px', // Размер текста "(2 игроков)" под числом 711

            LINE_MARGIN: '2px',               // Отступы между линиями и строками текста
            DIFF_FONT_SIZE: '26px',           // Размер числа "Разница эло" (крупно сверху)
            DIFF_LABEL_FONT_SIZE: '12px'     // Размер подписи "Разница эло"
        },

        // === ОФОРМЛЕНИЕ БЛОКА ПАТИ НА ГЛАВНОЙ (MATCHMAKING) ===
        MAIN_PARTY_BLOCK: {
            // Общий стиль контейнера под названием пати
            BACKGROUND: 'rgba(0, 0, 0, 0.85)', // Цвет фона блока на главной
            TEXT_COLOR: '#fff',                // Цвет текста
            BORDER_RADIUS: '4px',              // Скругление блока
            PADDING: '6px 10px',               // Отступы внутри блока
            BORDER_COLOR: 'rgba(255,255,255,0.2)', // Цвет линий‑разделителей
            FONT_FAMILY: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif", // Шрифт

            // Строка: "Среднее ELO лобби"
            TITLE_FONT_SIZE: '13px',           // Размер заголовка на главной

            // Строка с обычным средним: "611 (2 игроков)"
            // ЭТО КЛЮЧЕВОЙ ПАРАМЕТР для увеличения числа "611" на главной
            VALUE_FONT_SIZE: '20px',           // Размер числа 611 (основное, самое крупное значение)
            VALUE_FONT_WEIGHT: '700',          // Жирность этого числа
            VALUE_PLAYERS_FONT_SIZE: '12px',   // Размер текста "(2 игроков)" под числом 611

            // Строка "+100"
            PLUS_LABEL_FONT_SIZE: '13px',      // Размер надписи "+100" на главной

            // Строка с ELO по правилу +100: "711 (2 игроков)"
            // ЭТО КЛЮЧЕВОЙ ПАРАМЕТР для увеличения числа "711" на главной
            PLUS_VALUE_FONT_SIZE: '20px',      // Размер числа 711
            PLUS_VALUE_PLAYERS_FONT_SIZE: '12px', // Размер текста "(2 игроков)" под числом 711

            LINE_MARGIN: '2px',                // Отступы между линиями и строками
            DIFF_FONT_SIZE: '26px',            // Размер числа "Разница эло" (крупно сверху)
            DIFF_LABEL_FONT_SIZE: '13px'      // Размер подписи "Разница эло"
        }
    };

    // === СЕЛЕКТОРЫ ДЛЯ ПОИСКА ЭЛЕМЕНТОВ ===
    const SELECTORS = {
        // Контейнер пати (широкий поиск; FACEIT часто меняет хеши в классах)
        PARTY_CONTAINER: [
            'section[class*="Container-sc-c9a9cc81-0"]',
            'section[class*="Container"]',
            'div[class*="CardContainer-sc-c9a9cc81-1"]',
            'div[class*="CardContainer"]',
            'div[class*="PartyControl"]',
            '[class*="Party__"]',
            '[data-testid*="party"]',
            '[data-testid*="Party"]'
        ],
        
        // Карточки игроков (более точные селекторы)
        PLAYER_CARDS: [
            'div[class*="PlayerCardWrapper-sc-84becbd1-2"]',
            'div[class*="PlayerCardWrapper"]',
            'div[class*="PlayerCard"]',
            '[data-testid="playerCard"]',
            'div[data-testid="Invite players"]',
            '[class*="StyledPlayerCard"]',
            '[class*="Party__StyledPlayerCard"]'
        ],
        
        // Контейнеры лобби (для списка лобби в клубах)
        LOBBY_CONTAINERS: [
            '[data-testid="lobby-card"]',
            '[class*="LobbyCard"]',
            '[class*="PartyCard"]',
            '[class*="CardsHolder"]',
            '[class*="party-card"]'
        ],
        
        // ELO текст (более точные селекторы)
        ELO_TEXT: [
            'span[class*="EloText-sc-809cccd8-1"]',
            'span[class*="EloText"]',
            'span[class*="Elo"]',
            '[class*="Tag__Container"] span[class*="Elo"]',
            '[class*="Tag__Container"] span'
        ]
    };

    // === ПЕРЕМЕННЫЕ ===
    let displayElement = null;
    let updateInterval = null;
    // Один глобальный блок для пати на странице матчмейкинга, чтобы не плодить дубли
    let mainPartyDisplayElement = null;
    // Время последнего уведомления о высокой разнице эло (для кулдауна)
    let lastEloDiffNotifyTime = 0;
    const highEloDiffStartBySource = new Map();  // ключ: 'main' | container — когда впервые увидели высокую разницу
    const lastNotifiedLobbyKeyBySource = new Map();  // уже уведомили для этого состава лобби — не спамить
    let lastPathnameForNotify = '';  // сброс оповещений при переходе на другую страницу
    // Кэш результатов для оптимизации — обновляем DOM только при изменении
    const lobbyResultCache = new WeakMap();
    let lastMainPartyResultKey = '';
    const RENDER_POLL_MS = 150;        // Интервал агрессивного опроса когда блок не отрисован (мс)
    const RENDER_POLL_MAX_MS = 30000;  // Макс. время опроса (30 сек)
    let matchmakingRetryCount = 0;
    let lobbyRetryCount = 0;
    let aggressivePollingId = null;

    // Запросить разрешение на браузерные уведомления (нужно для показа уведомлений при большой разнице эло)
    function requestNotificationPermissionIfNeeded() {
        if (!CONFIG.NOTIFY_ON_HIGH_ELO_DIFF || typeof Notification === 'undefined') return;
        if (Notification.permission !== 'default') return; // уже выдано или запрещено
        try {
            Notification.requestPermission().catch(() => {});
        } catch (e) {}
    }

    // === ОСНОВНЫЕ ФУНКЦИИ ===
    
    // Кастомное оповещение на странице (большой баннер по центру экрана)
    function showCustomEloDiffAlert(eloDiff) {
        if (!CONFIG.CUSTOM_ALERT_ON_HIGH_ELO_DIFF || eloDiff == null || eloDiff <= 0) return;
        const existing = document.getElementById('faceit-elo-diff-custom-alert');
        if (existing && existing.parentNode) existing.remove();

        const cfg = CONFIG.CUSTOM_ALERT || {};
        const fontSize = cfg.FONT_SIZE || '28px';
        const minWidth = cfg.MIN_WIDTH || '420px';
        const padding = cfg.PADDING || '28px 36px';
        const duration = CONFIG.CUSTOM_ALERT_DURATION_MS || 0;

        const box = document.createElement('div');
        box.id = 'faceit-elo-diff-custom-alert';
        box.setAttribute('data-faceit-elo-script', '1');
        box.style.cssText = `
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            z-index: 2147483647 !important;
            visibility: visible !important;
            display: flex !important;
            min-width: ${minWidth};
            max-width: 90vw;
            padding: ${padding};
            background: linear-gradient(135deg, #c0392b 0%, #8e2a22 100%);
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: ${fontSize};
            font-weight: 700;
            text-align: center;
            border-radius: 12px;
            box-shadow: 0 12px 48px rgba(0,0,0,0.5), 0 0 0 4px rgba(255,255,255,0.15);
            pointer-events: auto;
            align-items: center;
            justify-content: center;
            gap: 16px;
            flex-wrap: wrap;
        `;
        const text = document.createElement('span');
        text.textContent = `Внимание! Разница эло в лобби: ${eloDiff.toLocaleString('ru-RU')} (порог: ${CONFIG.ELO_DIFF_WARNING_THRESHOLD})`;
        text.style.whiteSpace = 'pre-wrap';
        box.appendChild(text);
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Закрыть');
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.25);
            border: none;
            color: #fff;
            width: 40px;
            height: 40px;
            border-radius: 8px;
            font-size: 28px;
            line-height: 1;
            cursor: pointer;
            flex-shrink: 0;
        `;
        closeBtn.onclick = () => removeAlert();
        box.appendChild(closeBtn);

        function removeAlert() {
            if (box.parentNode) box.parentNode.removeChild(box);
            if (timer) clearTimeout(timer);
        }

        let timer = null;
        if (duration > 0) timer = setTimeout(removeAlert, duration);

        const appendAlert = () => {
            if (!document.body) return;
            try {
                document.body.appendChild(box);
            } catch (e) {
                console.warn('Faceit Party Average Elo: Custom alert append failed', e);
            }
        };
        appendAlert();
    }

    // Показать браузерное уведомление, если разница эло превышает порог (с кулдауном и настройкой вкл/выкл)
    // sourceKey: 'main' для матчмейкинга, container — для конкретного лобби в клубах (отдельная стабильность для каждого)
    function tryNotifyHighEloDiff(result, sourceKey) {
        const path = window.location.pathname;
        if (path !== lastPathnameForNotify) {
            lastPathnameForNotify = path;
            lastEloDiffNotifyTime = 0;
            highEloDiffStartBySource.clear();
            lastNotifiedLobbyKeyBySource.clear();
        }
        const lobbyKey = result ? `${result.average}-${result.count}-${result.eloDiff}` : '';
        if (lobbyKey && lastNotifiedLobbyKeyBySource.get(sourceKey) === lobbyKey) return;  // лобби не менялось — не спамить
        const wantNotify = CONFIG.NOTIFY_ON_HIGH_ELO_DIFF;
        const wantSound = CONFIG.NOTIFY_SOUND_ON_HIGH_ELO_DIFF;
        const wantCustomAlert = CONFIG.CUSTOM_ALERT_ON_HIGH_ELO_DIFF;
        if (!result || result.eloDiff == null || (!wantNotify && !wantSound && !wantCustomAlert)) return;
        if (result.count < 2 || result.eloDiff <= 0) return;  // минимум 2 игрока, разница > 0 — избегаем фейковых
        const now = Date.now();
        if (result.eloDiff <= CONFIG.ELO_DIFF_WARNING_THRESHOLD) {
            highEloDiffStartBySource.delete(sourceKey);
            lastNotifiedLobbyKeyBySource.delete(sourceKey);  // сброс — при следующем высоком diff уведомим снова
            return;
        }
        if (now - lastEloDiffNotifyTime < CONFIG.ELO_DIFF_NOTIFY_COOLDOWN_MS) return;
        if (!highEloDiffStartBySource.has(sourceKey)) highEloDiffStartBySource.set(sourceKey, now);
        const startTime = highEloDiffStartBySource.get(sourceKey);
        if (now - startTime < CONFIG.ELO_DIFF_NOTIFY_STABILITY_MS) return;

        const playWarningSound = () => {
            if (!wantSound || !CONFIG.ELO_DIFF_SOUND_URL) return;
            try {
                const audio = new Audio(CONFIG.ELO_DIFF_SOUND_URL);
                audio.volume = 0.7;
                audio.play().catch(() => {});
            } catch (e) {
                console.warn('Faceit Party Average Elo: Sound failed', e);
            }
        };

        const fireWarning = () => {
            playWarningSound();
            if (wantCustomAlert) showCustomEloDiffAlert(result.eloDiff);
            try {
                if (wantNotify && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                    new Notification('FACEIT: большая разница эло', {
                        body: `Разница эло в лобби: ${result.eloDiff.toLocaleString('ru-RU')} (порог: ${CONFIG.ELO_DIFF_WARNING_THRESHOLD}). Обратите внимание!`,
                        icon: 'https://faceit.com/favicon.ico',
                        tag: 'faceit-elo-diff-warning'
                    });
                }
            } catch (e) {
                console.warn('Faceit Party Average Elo: Notification failed', e);
            }
            lastEloDiffNotifyTime = now;
            highEloDiffStartBySource.delete(sourceKey);
            lastNotifiedLobbyKeyBySource.set(sourceKey, lobbyKey);
        };

        if (wantNotify && typeof Notification !== 'undefined') {
            if (Notification.permission === 'granted') {
                fireWarning();
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(p => {
                    if (p === 'granted') fireWarning();
                    else fireWarning(); // звук всё равно при отказе в уведомлениях
                }).catch(() => { fireWarning(); });
            } else {
                fireWarning(); // permission denied — только звук
            }
        } else {
            fireWarning(); // без браузерного уведомления — только звук (если включён)
        }
    }
    
    // Поиск контейнера пати (ищем по всей странице). Возвращает контейнер даже без ELO — покажем "н/д" до загрузки
    function findPartyContainer() {
        // 1) Строгий поиск: контейнер + карточки с ELO
        for (const selector of SELECTORS.PARTY_CONTAINER) {
            try {
                const containers = document.querySelectorAll(selector);
                for (const container of containers) {
                    if (!container || !container.isConnected) continue;
                    for (const cardSelector of SELECTORS.PLAYER_CARDS) {
                        const playerCards = container.querySelectorAll(cardSelector);
                        if (playerCards.length > 0) {
                            for (const card of playerCards) {
                                if (extractEloFromCard(card) !== null) return container;
                            }
                        }
                    }
                }
            } catch (e) { continue; }
        }
        // 2) Карточки с ELO по всей странице
        for (const cardSelector of SELECTORS.PLAYER_CARDS) {
            try {
                const cards = document.querySelectorAll(cardSelector);
                if (cards.length > 0) {
                    for (const card of cards) {
                        if (extractEloFromCard(card) !== null && card.isConnected) {
                            const parent = card.closest('section') || card.closest('div[class*="Container"]') || card.closest('div[class*="PartyControl"]') || card.closest('div[class*="Party"]') || document.body;
                            if (parent && parent !== document.body) return parent;
                        }
                    }
                }
            } catch (e) { continue; }
        }
        // 3) Релаксированный: контейнер с карточками по структуре (даже без ELO) — отрисуем блок, потом обновим
        for (const selector of SELECTORS.PARTY_CONTAINER) {
            try {
                const containers = document.querySelectorAll(selector);
                for (const container of containers) {
                    if (!container || !container.isConnected) continue;
                    for (const cardSelector of SELECTORS.PLAYER_CARDS) {
                        const playerCards = container.querySelectorAll(cardSelector);
                        if (playerCards.length > 0) return container;
                    }
                }
            } catch (e) { continue; }
        }
        for (const cardSelector of SELECTORS.PLAYER_CARDS) {
            try {
                const anyCards = document.querySelectorAll(cardSelector);
                if (anyCards.length > 0 && anyCards[0].isConnected) {
                    const parent = anyCards[0].closest('section') || anyCards[0].closest('div[class*="Container"]') || anyCards[0].closest('div[class*="Party"]');
                    if (parent && parent !== document.body) return parent;
                }
            } catch (e) { continue; }
        }
        // 4) Matchmaking-специфично: ищем "Invite players" или структуру пати на странице матчмейкинга
        if (window.location.pathname.includes('/matchmaking')) {
            const inviteEl = document.querySelector('[data-testid="Invite players"]');
            if (inviteEl && inviteEl.isConnected) {
                const parent = inviteEl.closest('section') || inviteEl.closest('div[class*="Container"]') || inviteEl.closest('div[class*="Party"]') || inviteEl.closest('div[class*="Card"]') || inviteEl.parentElement?.parentElement;
                if (parent && parent !== document.body) return parent;
            }
            const partyControl = document.querySelector('[class*="PartyControl"]') || document.querySelector('[class*="Party__"]');
            if (partyControl && partyControl.isConnected) return partyControl;
        }
        return null;
    }

    // Поиск всех карточек игроков (ищем в контейнере или по всей странице)
    function findPlayerCards(container) {
        const cards = [];
        const cardSet = new Set();
        const searchRoot = container || document.body;
        
        try {
            for (const selector of SELECTORS.PLAYER_CARDS) {
                try {
                    const found = searchRoot.querySelectorAll(selector);
                    if (found.length === 0) continue;
                    
                    found.forEach(card => {
                        // Проверяем, что это действительно карточка игрока (должна содержать ELO)
                        if (!cardSet.has(card) && card.parentElement && card.isConnected) {
                            // Проверяем наличие ELO в карточке
                            const elo = extractEloFromCard(card);
                            if (elo !== null) {
                                cards.push(card);
                                cardSet.add(card);
                            }
                        }
                    });
                } catch (e) {
                    // Игнорируем ошибки при поиске по селектору
                    continue;
                }
            }
        } catch (error) {
            console.error('Faceit Party Average Elo: Error finding player cards', error);
        }
        
        return cards;
    }

    // Извлечение ELO из карточки игрока
    function extractEloFromCard(card) {
        if (!card) return null;
        const isValidElo = (n) => Number.isFinite(n) && n >= 100 && n < 10000; // отсекаем skill level 1-10 и мусорные числа

        // Ищем ELO текст в карточке - сначала ищем в Tag__Container
        const tagContainer = card.querySelector('[class*="Tag__Container"]');
        if (tagContainer) {
            const eloElement = tagContainer.querySelector('span[class*="EloText"], span[class*="Elo"]');
            if (eloElement) {
                const eloText = eloElement.textContent.trim();
                // Убираем запятые и пробелы, оставляем только цифры
                const eloNumber = parseInt(eloText.replace(/[,\s]/g, ''), 10);
                if (isValidElo(eloNumber)) {
                    return eloNumber;
                }
            }
        }

        // Ищем ELO текст напрямую в карточке
        for (const selector of SELECTORS.ELO_TEXT) {
            const eloElement = card.querySelector(selector);
            if (eloElement) {
                const eloText = eloElement.textContent.trim();
                // Убираем запятые и пробелы, оставляем только цифры
                const eloNumber = parseInt(eloText.replace(/[,\s]/g, ''), 10);
                if (isValidElo(eloNumber)) {
                    return eloNumber;
                }
            }
        }

        // Альтернативный поиск: ищем числа в тексте карточки
        const cardText = card.textContent || '';
        // Ищем паттерны типа "693", "1,667", "2,131" (3-4 цифры, возможно с запятыми)
        const eloMatches = cardText.match(/\b(\d{1,3}(?:[,\s]\d{3})*)\b/g);
        if (eloMatches && eloMatches.length > 0) {
            // Берём последнее "похоже на ELO" число (>= 100), чтобы не схватить skill level "10"
            for (let i = eloMatches.length - 1; i >= 0; i--) {
                const m = eloMatches[i];
                const n = parseInt(m.replace(/[,\s]/g, ''), 10);
                if (isValidElo(n)) return n;
            }
        }

        return null;
    }

    // Подсчёт карточек игроков (без проверки ELO), чтобы корректно выбирать контейнер при responsive/Spa
    function countPlayerCardNodes(searchRoot) {
        if (!searchRoot) return 0;
        const set = new Set();
        for (const selector of SELECTORS.PLAYER_CARDS) {
            try {
                searchRoot.querySelectorAll(selector).forEach(el => {
                    if (el && el.isConnected) set.add(el);
                });
            } catch (e) {}
        }
        return set.size;
    }

    // Лучший контейнер-строка для вставки блока на matchmaking (обычно CardContainer с максимумом PlayerCardWrapper)
    function findBestMainPartyHeaderRow(container, partyControl) {
        const candidates = [];
        if (container) candidates.push(container);
        try {
            container?.querySelectorAll('[class*="CardContainer"]').forEach(el => candidates.push(el));
        } catch (e) {}
        if (partyControl && partyControl !== container) candidates.push(partyControl);

        let best = null;
        let bestCount = 0;
        const seen = new Set();
        for (const c of candidates) {
            if (!c || seen.has(c)) continue;
            seen.add(c);
            const cnt = countPlayerCardNodes(c);
            if (cnt > bestCount) {
                best = c;
                bestCount = cnt;
            }
        }
        return best || partyControl || container || null;
    }

    // Расчет среднего ELO по массиву карточек игроков
    // ВАЖНО: здесь мы дополнительно убираем дубли (одного и того же игрока в desktop/mobile верстке),
    // чтобы количество игроков не удваивалось (6 вместо 3, 10 вместо 5 и т.п.).
    function calculateAverageEloForCards(playerCards) {
        if (!playerCards || playerCards.length === 0) {
                return null;
            }

            const eloValues = [];
        const seenPlayers = new Set(); // ключи вида "nickname#elo"

            playerCards.forEach(card => {
                try {
                    const elo = extractEloFromCard(card);
                if (elo === null || elo <= 0) return;

                // Пытаемся получить никнейм игрока
                let nickname = '';
                const nicknameEl =
                    card.querySelector('.styles__Nickname-sc-9bcf1d48-2') ||
                    card.querySelector('[class*="Nickname"]');
                if (nicknameEl && nicknameEl.textContent) {
                    nickname = nicknameEl.textContent.trim();
                }

                const key = `${nickname}#${elo}`;
                if (seenPlayers.has(key)) {
                    // Такой игрок уже учтен (скорее всего дубликат верстки)
                    return;
                }
                seenPlayers.add(key);

                eloValues.push(elo);
                } catch (e) {
                    // Игнорируем ошибки при извлечении ELO из одной карточки
                }
            });

            if (eloValues.length === 0) {
                return null;
            }

            // Считаем среднее
            const sum = eloValues.reduce((acc, val) => acc + val, 0);
        const baseAverage = sum / eloValues.length;
        const roundedAverage = Math.round(baseAverage);

        // Добавляем +100 ELO ПОСЛЕ вычисления среднего, как просили
        const adjustedAverage = roundedAverage + 100;

        // Разница эло: максимальное − минимальное в лобби
        const maxElo = Math.max(...eloValues);
        const minElo = Math.min(...eloValues);
        const eloDiff = maxElo - minElo;

            return {
            average: roundedAverage,
            adjustedAverage: adjustedAverage,
                count: eloValues.length,
                values: eloValues,
                eloDiff: eloDiff
            };
    }

    // Расчет среднего ELO (глобально по найденной пати)
    function calculateAverageElo() {
        try {
            // Сначала пытаемся найти контейнер, если не нашли - ищем карточки по всей странице
            let container = findPartyContainer();
            let playerCards = [];
            
            if (container) {
                playerCards = findPlayerCards(container);
            }
            
            // Если не нашли в контейнере, ищем по всей странице
            if (playerCards.length === 0) {
                playerCards = findPlayerCards(null);
            }
            
            const result = calculateAverageEloForCards(playerCards);
            return result;
        } catch (error) {
            console.error('Faceit Party Average Elo: Error calculating average', error);
            return null;
        }
    }

    // Заглушка для старого элемента отображения, чтобы не ломать логику init()
    function createDisplayElement() {
        // Ничего не рисуем, просто возвращаем null
            return null;
        }

    // Обновление отображения для текущей пати (без отдельной кнопки/блока)
    function updateDisplay() {
        try {
            const result = calculateAverageElo();
            if (!result) return;
        } catch (error) {
            console.error('Faceit Party Average Elo: Error updating display', error);
        }
    }

    let lastRunFullUpdatePathname = '';
    let aggressivePollStartTime = 0;

    function stopAggressivePolling() {
        if (aggressivePollingId) {
            clearInterval(aggressivePollingId);
            aggressivePollingId = null;
        }
    }

    function startAggressivePollingIfNeeded() {
        if (aggressivePollingId) return;
        aggressivePollStartTime = Date.now();
        aggressivePollingId = setInterval(() => {
            if (Date.now() - aggressivePollStartTime > RENDER_POLL_MAX_MS) {
                stopAggressivePolling();
                return;
            }
            runFullUpdate();
        }, RENDER_POLL_MS);
    }

    // Полное обновление: display + блоки ELO + оповещения
    function runFullUpdate() {
        const path = window.location.pathname;
        if (path !== lastRunFullUpdatePathname) {
            lastRunFullUpdatePathname = path;
            matchmakingRetryCount = 0;
            lobbyRetryCount = 0;
            stopAggressivePolling();
        }
        updateDisplay();
        if (CONFIG.SHOW_LOBBY_ELO_BLOCKS && !path.includes('/matchmaking')) {
            updateLobbyDisplays();
        }
        if (CONFIG.SHOW_MAIN_PARTY_ELO_BLOCK && path.includes('/matchmaking')) {
            updateMainPartyDisplay();
        }
    }

    // === ОТОБРАЖЕНИЕ СРЕДНЕГО ELO ПОД КАЖДЫМ ЛОББИ ===

    // Поиск контейнеров лобби на странице
    function findLobbyContainers() {
        const containersSet = new Set();

        try {
            // 1) Основной способ — как в ДДОС-скрипте: от кнопки joinCard поднимаемся вверх
            const joinCards = document.querySelectorAll('[data-testid="joinCard"]');
            joinCards.forEach(joinCard => {
                if (!joinCard || !joinCard.isConnected) return;

                let parent =
                    joinCard.closest('[class*="CardsHolder"]') ||
                    joinCard.closest('[class*="LobbyCard"]') ||
                    joinCard.closest('[class*="PartyCard"]') ||
                    joinCard.closest('[class*="party-card"]') ||
                    joinCard.parentElement;

                if (!parent) return;

                const playerCards = findPlayerCards(parent);
                if (playerCards.length > 0) {
                    containersSet.add(parent);
                }
            });

            // 2) Резервный способ — по заранее заданным селекторам контейнеров
            for (const selector of SELECTORS.LOBBY_CONTAINERS) {
                let found;
                try {
                    found = document.querySelectorAll(selector);
                } catch (e) {
                    continue;
                }
                if (!found || found.length === 0) continue;

                found.forEach(container => {
                    if (!container || !container.isConnected) return;

                    const playerCards = findPlayerCards(container);
                    if (playerCards.length > 0) {
                        containersSet.add(container);
                    }
                });
            }
        } catch (error) {
            console.error('Faceit Party Average Elo: Error finding lobby containers', error);
        }

        return Array.from(containersSet);
    }

    // Обновление надписей под лобби (список лобби в клубе)
    function updateLobbyDisplays() {
        try {
            if (!CONFIG.SHOW_LOBBY_ELO_BLOCKS) return;
            if (window.location.pathname.includes('/matchmaking')) return;

            const lobbyContainers = findLobbyContainers();
            if (!lobbyContainers || lobbyContainers.length === 0) {
                startAggressivePollingIfNeeded();
                return;
            }
            lobbyRetryCount = 0;
            stopAggressivePolling();

            lobbyContainers.forEach(container => {
                const playerCards = findPlayerCards(container);
                const result = calculateAverageEloForCards(playerCards);
                const cacheKey = result ? `${result.average}-${result.count}-${result.eloDiff}` : 'n';
                tryNotifyHighEloDiff(result, container); // вызываем всегда (проверка стабильности внутри)
                if (lobbyResultCache.get(container) === cacheKey) return; // данные не изменились — пропускаем DOM

                // Ищем/создаем элемент для вывода под конкретным лобби
                let infoElement = container.querySelector('.faceit-lobby-average-elo');
                let titleElement;
                let valueNumberElement;
                let valuePlayersElement;
                if (!infoElement) {
                    infoElement = document.createElement('div');
                    infoElement.className = 'faceit-lobby-average-elo';
                    infoElement.style.cssText = `
                        margin-top: 2px;
                        padding: ${CONFIG.LOBBY_BLOCK.PADDING};
                        border-radius: ${CONFIG.LOBBY_BLOCK.BORDER_RADIUS};
                        background: ${CONFIG.LOBBY_BLOCK.BACKGROUND};
                        color: ${CONFIG.LOBBY_BLOCK.TEXT_COLOR};
                        font-size: 13px;
                        font-weight: 600;
                        font-family: ${CONFIG.LOBBY_BLOCK.FONT_FAMILY};
                        text-align: center;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        width: max-content;
                        margin-left: auto;
                        pointer-events: none; /* чтобы не было никаких тултипов/ховеров */
                    `;

                    // Линия сверху (для визуальной рамки)
                    const topLine = document.createElement('div');
                    topLine.className = 'faceit-lobby-average-elo-line-top';
                    topLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN};`;

                    const diffContainer = document.createElement('div');
                    diffContainer.className = 'faceit-lobby-average-elo-diff';
                    diffContainer.style.cssText = 'margin-bottom: 4px; text-align: center;';
                    const diffLabel = document.createElement('div');
                    diffLabel.className = 'faceit-lobby-average-elo-diff-label';
                    diffLabel.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.DIFF_LABEL_FONT_SIZE}; opacity: 0.9;`;
                    diffLabel.textContent = 'Разница эло';
                    const diffValue = document.createElement('div');
                    diffValue.className = 'faceit-lobby-average-elo-diff-value';
                    diffValue.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.DIFF_FONT_SIZE}; font-weight: 700;`;
                    diffContainer.appendChild(diffLabel);
                    diffContainer.appendChild(diffValue);

                    titleElement = document.createElement('div');
                    titleElement.className = 'faceit-lobby-average-elo-title';
                    titleElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.TITLE_FONT_SIZE}; opacity: 0.9;`;

                    const middleLine = document.createElement('div');
                    middleLine.className = 'faceit-lobby-average-elo-line-middle';
                    middleLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN} 0;`;

                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'faceit-lobby-average-elo-value';

                    valueNumberElement = document.createElement('div');
                    valueNumberElement.className = 'faceit-lobby-average-elo-value-number';
                    valueNumberElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_SIZE}; font-weight: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_WEIGHT};`;

                    valuePlayersElement = document.createElement('div');
                    valuePlayersElement.className = 'faceit-lobby-average-elo-value-players';
                    valuePlayersElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                    const plusLabel = document.createElement('div');
                    plusLabel.className = 'faceit-lobby-average-elo-plus-label';
                    plusLabel.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_LABEL_FONT_SIZE}; margin-top: 2px; opacity: 0.9;`;

                    const plusValueContainer = document.createElement('div');
                    plusValueContainer.className = 'faceit-lobby-average-elo-plus-value';

                    const plusNumberElement = document.createElement('div');
                    plusNumberElement.className = 'faceit-lobby-average-elo-plus-number';
                    plusNumberElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_VALUE_FONT_SIZE}; font-weight: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_WEIGHT};`;

                    const plusPlayersElement = document.createElement('div');
                    plusPlayersElement.className = 'faceit-lobby-average-elo-plus-players';
                    plusPlayersElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                    const bottomLine = document.createElement('div');
                    bottomLine.className = 'faceit-lobby-average-elo-line-bottom';
                    bottomLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin-top: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN};`;

                    valueContainer.appendChild(valueNumberElement);
                    valueContainer.appendChild(valuePlayersElement);

                    plusValueContainer.appendChild(plusNumberElement);
                    plusValueContainer.appendChild(plusPlayersElement);

                    infoElement.appendChild(topLine);
                    infoElement.appendChild(diffContainer);
                    infoElement.appendChild(titleElement);
                    infoElement.appendChild(middleLine);
                    infoElement.appendChild(valueContainer);
                    infoElement.appendChild(plusLabel);
                    infoElement.appendChild(plusValueContainer);
                    infoElement.appendChild(bottomLine);

                    // Пытаемся найти кнопку/текст "VS" и вставить перед ней (как ты выделял)
                    let vsParent = null;
                    let vsElement = null;
                    try {
                        const allEls = container.querySelectorAll('*');
                        for (const el of allEls) {
                            const text = (el.textContent || '').trim();
                            if (text === 'VS') {
                                vsElement = el;
                                vsParent = el.parentElement;
                                break;
                            }
                        }
                    } catch (e) {
                        // игнорируем, используем fallback ниже
                    }

                    if (vsParent && vsElement) {
                        vsParent.insertBefore(infoElement, vsElement);
                    } else {
                        // Стараемся вставить ближе к низу карточки лобби
                        const footer =
                            container.querySelector('[class*="RequirementsHolder"]') ||
                            container.querySelector('[class*="Footer"]') ||
                            container;

                        footer.appendChild(infoElement);
                    }
                } else {
                    // Если элемент уже есть, находим вложенные строки
                    titleElement = infoElement.querySelector('.faceit-lobby-average-elo-title');
                    const valueContainer = infoElement.querySelector('.faceit-lobby-average-elo-value');
                    valueNumberElement = infoElement.querySelector('.faceit-lobby-average-elo-value-number');
                    valuePlayersElement = infoElement.querySelector('.faceit-lobby-average-elo-value-players');
                    let plusLabel = infoElement.querySelector('.faceit-lobby-average-elo-plus-label');
                    const plusValueContainer = infoElement.querySelector('.faceit-lobby-average-elo-plus-value');
                    let plusNumberElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-number');
                    let plusPlayersElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-players');
                    const topLine = infoElement.querySelector('.faceit-lobby-average-elo-line-top');
                    const middleLine = infoElement.querySelector('.faceit-lobby-average-elo-line-middle');
                    const bottomLine = infoElement.querySelector('.faceit-lobby-average-elo-line-bottom');
                    const diffContainerEl = infoElement.querySelector('.faceit-lobby-average-elo-diff');
                    const diffValueEl = infoElement.querySelector('.faceit-lobby-average-elo-diff-value');
                    if (!titleElement || !valueContainer || !valueNumberElement || !valuePlayersElement ||
                        !plusLabel || !plusValueContainer || !plusNumberElement || !plusPlayersElement ||
                        !topLine || !middleLine || !bottomLine || !diffContainerEl || !diffValueEl) {
                        infoElement.innerHTML = '';
                        const newTop = document.createElement('div');
                        newTop.className = 'faceit-lobby-average-elo-line-top';
                        newTop.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN};`;

                        const newDiffContainer = document.createElement('div');
                        newDiffContainer.className = 'faceit-lobby-average-elo-diff';
                        newDiffContainer.style.cssText = 'margin-bottom: 4px; text-align: center;';
                        const newDiffLabel = document.createElement('div');
                        newDiffLabel.className = 'faceit-lobby-average-elo-diff-label';
                        newDiffLabel.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.DIFF_LABEL_FONT_SIZE}; opacity: 0.9;`;
                        newDiffLabel.textContent = 'Разница эло';
                        const newDiffValue = document.createElement('div');
                        newDiffValue.className = 'faceit-lobby-average-elo-diff-value';
                        newDiffValue.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.DIFF_FONT_SIZE}; font-weight: 700;`;
                        newDiffContainer.appendChild(newDiffLabel);
                        newDiffContainer.appendChild(newDiffValue);

                        titleElement = document.createElement('div');
                        titleElement.className = 'faceit-lobby-average-elo-title';
                        titleElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.TITLE_FONT_SIZE}; opacity: 0.9;`;

                        const newMiddle = document.createElement('div');
                        newMiddle.className = 'faceit-lobby-average-elo-line-middle';
                        newMiddle.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN} 0;`;

                        const newValueContainer = document.createElement('div');
                        newValueContainer.className = 'faceit-lobby-average-elo-value';

                        valueNumberElement = document.createElement('div');
                        valueNumberElement.className = 'faceit-lobby-average-elo-value-number';
                        valueNumberElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_SIZE}; font-weight: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_WEIGHT};`;

                        valuePlayersElement = document.createElement('div');
                        valuePlayersElement.className = 'faceit-lobby-average-elo-value-players';
                        valuePlayersElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                        plusLabel = document.createElement('div');
                        plusLabel.className = 'faceit-lobby-average-elo-plus-label';
                        plusLabel.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_LABEL_FONT_SIZE}; margin-top: 2px; opacity: 0.9;`;

                        const newPlusValueContainer = document.createElement('div');
                        newPlusValueContainer.className = 'faceit-lobby-average-elo-plus-value';

                        plusNumberElement = document.createElement('div');
                        plusNumberElement.className = 'faceit-lobby-average-elo-plus-number';
                        plusNumberElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_VALUE_FONT_SIZE}; font-weight: ${CONFIG.LOBBY_BLOCK.VALUE_FONT_WEIGHT};`;

                        plusPlayersElement = document.createElement('div');
                        plusPlayersElement.className = 'faceit-lobby-average-elo-plus-players';
                        plusPlayersElement.style.cssText = `font-size: ${CONFIG.LOBBY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                        const newBottom = document.createElement('div');
                        newBottom.className = 'faceit-lobby-average-elo-line-bottom';
                        newBottom.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin-top: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN};`;

                        newValueContainer.appendChild(valueNumberElement);
                        newValueContainer.appendChild(valuePlayersElement);

                        newPlusValueContainer.appendChild(plusNumberElement);
                        newPlusValueContainer.appendChild(plusPlayersElement);

                        infoElement.appendChild(newTop);
                        infoElement.appendChild(newDiffContainer);
                        infoElement.appendChild(titleElement);
                        infoElement.appendChild(newMiddle);
                        infoElement.appendChild(newValueContainer);
                        infoElement.appendChild(plusLabel);
                        infoElement.appendChild(newPlusValueContainer);
                        infoElement.appendChild(newBottom);
                    }
                }

                // На всякий случай всегда убираем title, чтобы не было подсказки
                infoElement.removeAttribute('title');

                // Форсим, чтобы блок всегда был последним элементом в своём footer (справа)
                if (infoElement.parentElement && infoElement.parentElement.lastElementChild !== infoElement) {
                    infoElement.parentElement.appendChild(infoElement);
                }

                const diffValueElUpdate = infoElement.querySelector('.faceit-lobby-average-elo-diff-value');
            if (!result) {
                    titleElement.textContent = 'Среднее ELO лобби';
                    valueNumberElement.textContent = 'н/д';
                    valuePlayersElement.textContent = '';
                    if (diffValueElUpdate) { diffValueElUpdate.textContent = 'н/д'; diffValueElUpdate.style.color = ''; }
                    const plusLabel = infoElement.querySelector('.faceit-lobby-average-elo-plus-label');
                    const plusNumberElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-number');
                    const plusPlayersElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-players');
                    if (plusLabel) plusLabel.textContent = '';
                    if (plusNumberElement) plusNumberElement.textContent = '';
                    if (plusPlayersElement) plusPlayersElement.textContent = '';
                    infoElement.style.opacity = '0.6';
                } else {
                    const baseAvg = result.average.toLocaleString('ru-RU');
                    const plus100 = result.adjustedAverage.toLocaleString('ru-RU');
                    titleElement.textContent = 'Среднее ELO лобби';
                    // Число и количество игроков всегда отдельными элементами
                    valueNumberElement.textContent = baseAvg;
                    valuePlayersElement.textContent = `(${result.count} игроков)`;
                    if (diffValueElUpdate) {
                        diffValueElUpdate.textContent = (result.eloDiff != null ? result.eloDiff : 0).toLocaleString('ru-RU');
                        diffValueElUpdate.style.color = (result.eloDiff != null && result.eloDiff > CONFIG.ELO_DIFF_WARNING_THRESHOLD) ? '#e74c3c' : '#2ecc71';
                    }
                    const plusLabel = infoElement.querySelector('.faceit-lobby-average-elo-plus-label');
                    const plusNumberElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-number');
                    const plusPlayersElement = infoElement.querySelector('.faceit-lobby-average-elo-plus-players');
                    if (plusLabel) plusLabel.textContent = '+100';
                    if (plusNumberElement) plusNumberElement.textContent = plus100;
                    if (plusPlayersElement) plusPlayersElement.textContent = `(${result.count} игроков)`;
                    infoElement.style.opacity = '1';
                    // Отключаем всплывающую подсказку, чтобы не мешала
                    infoElement.removeAttribute('title');
                }
                lobbyResultCache.set(container, cacheKey);
            });
        } catch (error) {
            console.error('Faceit Party Average Elo: Error updating lobby displays', error);
        }
    }

    // Отображение среднего ELO для текущей пати на главной странице (matchmaking)
    function updateMainPartyDisplay() {
        try {
            if (!CONFIG.SHOW_MAIN_PARTY_ELO_BLOCK) return;
            if (!window.location.pathname.includes('/matchmaking')) {
                // Удаляем ВСЕ блоки (раньше удалялся только один и накапливались дубли при SPA/bfcache)
                document.querySelectorAll('.faceit-mainparty-average-elo').forEach(el => {
                    try { el.remove(); } catch (e) {}
                });
                mainPartyDisplayElement = null;
                lastMainPartyResultKey = '';
                return;
            }

            // Приводим к одному экземпляру блока на странице (иногда появляются дубли после переходов)
            const canonical = document.getElementById('faceit-mainparty-average-elo');
            if (canonical && canonical.classList && canonical.classList.contains('faceit-mainparty-average-elo')) {
                mainPartyDisplayElement = canonical;
                // удаляем любые другие блоки с таким классом, но другим id/без id
                document.querySelectorAll('.faceit-mainparty-average-elo').forEach(el => {
                    if (el !== canonical) {
                        try { el.remove(); } catch (e) {}
                    }
                });
            } else {
                // если id ещё не установлен (старые версии) — выбираем лучший из существующих и удаляем остальные
                const existing = Array.from(document.querySelectorAll('.faceit-mainparty-average-elo'));
                if (existing.length > 0) {
                    const score = (el) => {
                        const num = (el.querySelector('.faceit-mainparty-average-elo-value-number')?.textContent || '').trim();
                        const diff = (el.querySelector('.faceit-mainparty-average-elo-diff-value')?.textContent || '').trim();
                        let s = 0;
                        if (num && num !== 'н/д') s += 3;
                        if (diff && diff !== 'н/д') s += 1;
                        if ((el.textContent || '').includes('+100')) s += 1;
                        // предпочитаем «живой» блок (не затушенный)
                        if ((el.style.opacity || '') === '1') s += 1;
                        return s;
                    };
                    let best = existing[0];
                    let bestScore = score(best);
                    for (const el of existing.slice(1)) {
                        const sc = score(el);
                        if (sc >= bestScore) {
                            best = el;
                            bestScore = sc;
                        }
                    }
                    best.id = 'faceit-mainparty-average-elo';
                    mainPartyDisplayElement = best;
                    existing.forEach(el => {
                        if (el !== best) {
                            try { el.remove(); } catch (e) {}
                        }
                    });
                }
            }

            const container = findPartyContainer();
            if (!container) {
                startAggressivePollingIfNeeded();
                return;
            }
            matchmakingRetryCount = 0;
            stopAggressivePolling();

            const playerCards = findPlayerCards(container);
            const result = calculateAverageEloForCards(playerCards);
            const cacheKey = result ? `${result.average}-${result.count}-${result.eloDiff}` : 'n';
            tryNotifyHighEloDiff(result, 'main'); // вызываем всегда (проверка стабильности внутри)
            // Если значения не изменились, всё равно нужно убедиться, что блок существует и находится в актуальном месте
            if (lastMainPartyResultKey === cacheKey) {
                const existingEl = document.getElementById('faceit-mainparty-average-elo');
                if (existingEl && existingEl.classList && existingEl.classList.contains('faceit-mainparty-average-elo')) {
                    // Ищем хедер пати (PartyControl)
                    const partyControlExisting =
                        container.querySelector('[class*="PartyControl__Container"]') ||
                        container.querySelector('[class*="PartyControl__Holder"]') ||
                        container.querySelector('[class*="styles__PartyControlContainer"]') ||
                        container;

                    try {
                        const headerRowNow = findBestMainPartyHeaderRow(container, partyControlExisting);
                        if (headerRowNow && existingEl.parentElement !== headerRowNow) {
                            const rowStyleNow = window.getComputedStyle(headerRowNow);
                            if (rowStyleNow.position === 'static') headerRowNow.style.position = 'relative';
                            headerRowNow.appendChild(existingEl);
                        }
                    } catch (e) {}
                    mainPartyDisplayElement = existingEl;
                    return; // DOM уже актуален
                }
                // если блока нет — продолжаем ниже, создадим заново
            }

            // Ищем хедер пати (PartyControl)
            const partyControl =
                container.querySelector('[class*="PartyControl__Container"]') ||
                container.querySelector('[class*="PartyControl__Holder"]') ||
                container.querySelector('[class*="styles__PartyControlContainer"]') ||
                container;

            const headerRowPreferred = findBestMainPartyHeaderRow(container, partyControl);

            // Используем один глобальный элемент, чтобы не плодить бесконечно новые дивы
            let infoElement = mainPartyDisplayElement && document.body.contains(mainPartyDisplayElement)
                ? mainPartyDisplayElement
                : null;
            let titleElement;
            let valueNumberElement;
            let valuePlayersElement;

            if (!infoElement) {
                infoElement = document.createElement('div');
                infoElement.id = 'faceit-mainparty-average-elo';
                infoElement.className = 'faceit-mainparty-average-elo';
                infoElement.style.cssText = `
                    margin-top: 6px;
                    padding: ${CONFIG.MAIN_PARTY_BLOCK.PADDING};
                    border-radius: ${CONFIG.MAIN_PARTY_BLOCK.BORDER_RADIUS};
                    background: ${CONFIG.MAIN_PARTY_BLOCK.BACKGROUND};
                    color: ${CONFIG.MAIN_PARTY_BLOCK.TEXT_COLOR};
                    font-family: ${CONFIG.MAIN_PARTY_BLOCK.FONT_FAMILY};
                    display: inline-flex;
                    flex-direction: column;
                    align-items: flex-start;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 14px;
                    width: max-content;
                    margin-left: auto;
                    order: 9999; /* всегда в самом конце flex-строки */
                    align-self: flex-end;
                    justify-self: end;
                    flex: 0 0 auto;
                    pointer-events: none; /* чтобы не было никаких тултипов/ховеров */
                `;

                const topLine = document.createElement('div');
                topLine.className = 'faceit-mainparty-average-elo-line-top';
                topLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

                const diffContainer = document.createElement('div');
                diffContainer.className = 'faceit-mainparty-average-elo-diff';
                diffContainer.style.cssText = 'margin-bottom: 4px; text-align: center;';
                const diffLabel = document.createElement('div');
                diffLabel.className = 'faceit-mainparty-average-elo-diff-label';
                diffLabel.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.DIFF_LABEL_FONT_SIZE}; opacity: 0.9;`;
                diffLabel.textContent = 'Разница эло';
                const diffValue = document.createElement('div');
                diffValue.className = 'faceit-mainparty-average-elo-diff-value';
                diffValue.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.DIFF_FONT_SIZE}; font-weight: 700;`;
                diffContainer.appendChild(diffLabel);
                diffContainer.appendChild(diffValue);

                titleElement = document.createElement('div');
                titleElement.className = 'faceit-mainparty-average-elo-title';
                titleElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.TITLE_FONT_SIZE}; opacity: 0.9;`;

                const middleLine = document.createElement('div');
                middleLine.className = 'faceit-mainparty-average-elo-line-middle';
                middleLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN} 0;`;

                const valueContainer = document.createElement('div');
                valueContainer.className = 'faceit-mainparty-average-elo-value';

                valueNumberElement = document.createElement('div');
                valueNumberElement.className = 'faceit-mainparty-average-elo-value-number';
                valueNumberElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_SIZE}; margin-top: 2px; font-weight: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_WEIGHT};`;

                valuePlayersElement = document.createElement('div');
                valuePlayersElement.className = 'faceit-mainparty-average-elo-value-players';
                valuePlayersElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                const plusLabel = document.createElement('div');
                plusLabel.className = 'faceit-mainparty-average-elo-plus-label';
                plusLabel.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_LABEL_FONT_SIZE}; margin-top: 2px; opacity: 0.9;`;

                const plusValueContainer = document.createElement('div');
                plusValueContainer.className = 'faceit-mainparty-average-elo-plus-value';

                const plusNumberElement = document.createElement('div');
                plusNumberElement.className = 'faceit-mainparty-average-elo-plus-number';
                plusNumberElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_VALUE_FONT_SIZE}; margin-top: 2px; font-weight: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_WEIGHT};`;

                const plusPlayersElement = document.createElement('div');
                plusPlayersElement.className = 'faceit-mainparty-average-elo-plus-players';
                plusPlayersElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                const bottomLine = document.createElement('div');
                bottomLine.className = 'faceit-mainparty-average-elo-line-bottom';
                bottomLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-top: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

                valueContainer.appendChild(valueNumberElement);
                valueContainer.appendChild(valuePlayersElement);

                plusValueContainer.appendChild(plusNumberElement);
                plusValueContainer.appendChild(plusPlayersElement);

                infoElement.appendChild(topLine);
                infoElement.appendChild(diffContainer);
                infoElement.appendChild(titleElement);
                infoElement.appendChild(middleLine);
                infoElement.appendChild(valueContainer);
                infoElement.appendChild(plusLabel);
                infoElement.appendChild(plusValueContainer);
                infoElement.appendChild(bottomLine);

                const rowStyle = headerRowPreferred ? window.getComputedStyle(headerRowPreferred) : null;
                if (headerRowPreferred && rowStyle && rowStyle.position === 'static') {
                    headerRowPreferred.style.position = 'relative';
                }
                if (headerRowPreferred) headerRowPreferred.appendChild(infoElement);

                // Сохраняем для повторного использования
                mainPartyDisplayElement = infoElement;
            } else {
                // на всякий случай фиксируем id, если блок был создан старой версией/руками
                if (!infoElement.id) infoElement.id = 'faceit-mainparty-average-elo';
                titleElement = infoElement.querySelector('.faceit-mainparty-average-elo-title');
                const valueContainer = infoElement.querySelector('.faceit-mainparty-average-elo-value');
                valueNumberElement = infoElement.querySelector('.faceit-mainparty-average-elo-value-number');
                valuePlayersElement = infoElement.querySelector('.faceit-mainparty-average-elo-value-players');
                let plusLabel = infoElement.querySelector('.faceit-mainparty-average-elo-plus-label');
                const plusValueContainer = infoElement.querySelector('.faceit-mainparty-average-elo-plus-value');
                let plusNumberElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-number');
                let plusPlayersElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-players');
                const topLine = infoElement.querySelector('.faceit-mainparty-average-elo-line-top');
                const middleLine = infoElement.querySelector('.faceit-mainparty-average-elo-line-middle');
                const bottomLine = infoElement.querySelector('.faceit-mainparty-average-elo-line-bottom');
                const mainDiffValueEl = infoElement.querySelector('.faceit-mainparty-average-elo-diff-value');
                if (!titleElement || !valueContainer || !valueNumberElement || !valuePlayersElement ||
                    !plusLabel || !plusValueContainer || !plusNumberElement || !plusPlayersElement ||
                    !topLine || !middleLine || !bottomLine || !mainDiffValueEl) {
                    infoElement.innerHTML = '';
                    const newTop = document.createElement('div');
                    newTop.className = 'faceit-mainparty-average-elo-line-top';
                    newTop.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

                    const newDiffContainer = document.createElement('div');
                    newDiffContainer.className = 'faceit-mainparty-average-elo-diff';
                    newDiffContainer.style.cssText = 'margin-bottom: 4px; text-align: center;';
                    const newDiffLabel = document.createElement('div');
                    newDiffLabel.className = 'faceit-mainparty-average-elo-diff-label';
                    newDiffLabel.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.DIFF_LABEL_FONT_SIZE}; opacity: 0.9;`;
                    newDiffLabel.textContent = 'Разница эло';
                    const newDiffValue = document.createElement('div');
                    newDiffValue.className = 'faceit-mainparty-average-elo-diff-value';
                    newDiffValue.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.DIFF_FONT_SIZE}; font-weight: 700;`;
                    newDiffContainer.appendChild(newDiffLabel);
                    newDiffContainer.appendChild(newDiffValue);

                    titleElement = document.createElement('div');
                    titleElement.className = 'faceit-mainparty-average-elo-title';
                    titleElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.TITLE_FONT_SIZE}; opacity: 0.9;`;

                    const newMiddle = document.createElement('div');
                    newMiddle.className = 'faceit-mainparty-average-elo-line-middle';
                    newMiddle.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN} 0;`;

                    const newValueContainer = document.createElement('div');
                    newValueContainer.className = 'faceit-mainparty-average-elo-value';

                    valueNumberElement = document.createElement('div');
                    valueNumberElement.className = 'faceit-mainparty-average-elo-value-number';
                    valueNumberElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_SIZE}; margin-top: 2px; font-weight: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_WEIGHT};`;

                    valuePlayersElement = document.createElement('div');
                    valuePlayersElement.className = 'faceit-mainparty-average-elo-value-players';
                    valuePlayersElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                    plusLabel = document.createElement('div');
                    plusLabel.className = 'faceit-mainparty-average-elo-plus-label';
                    plusLabel.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_LABEL_FONT_SIZE}; margin-top: 2px; opacity: 0.9;`;

                    const newPlusValueContainer = document.createElement('div');
                    newPlusValueContainer.className = 'faceit-mainparty-average-elo-plus-value';

                    plusNumberElement = document.createElement('div');
                    plusNumberElement.className = 'faceit-mainparty-average-elo-plus-number';
                    plusNumberElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_VALUE_FONT_SIZE}; margin-top: 2px; font-weight: ${CONFIG.MAIN_PARTY_BLOCK.VALUE_FONT_WEIGHT};`;

                    plusPlayersElement = document.createElement('div');
                    plusPlayersElement.className = 'faceit-mainparty-average-elo-plus-players';
                    plusPlayersElement.style.cssText = `font-size: ${CONFIG.MAIN_PARTY_BLOCK.PLUS_VALUE_PLAYERS_FONT_SIZE}; opacity: 0.9;`;

                    const newBottom = document.createElement('div');
                    newBottom.className = 'faceit-mainparty-average-elo-line-bottom';
                    newBottom.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-top: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

                    newValueContainer.appendChild(valueNumberElement);
                    newValueContainer.appendChild(valuePlayersElement);

                    newPlusValueContainer.appendChild(plusNumberElement);
                    newPlusValueContainer.appendChild(plusPlayersElement);

                    infoElement.appendChild(newTop);
                    infoElement.appendChild(newDiffContainer);
                    infoElement.appendChild(titleElement);
                    infoElement.appendChild(newMiddle);
                    infoElement.appendChild(newValueContainer);
                    infoElement.appendChild(plusLabel);
                    infoElement.appendChild(newPlusValueContainer);
                    infoElement.appendChild(newBottom);
                }

                // На всякий случай всегда убираем title, чтобы не было подсказки
                infoElement.removeAttribute('title');
            }

            const mainPartyDiffValue = infoElement.querySelector('.faceit-mainparty-average-elo-diff-value');
            if (!result) {
                titleElement.textContent = 'Среднее ELO лобби';
                valueNumberElement.textContent = 'н/д';
                valuePlayersElement.textContent = '';
                if (mainPartyDiffValue) { mainPartyDiffValue.textContent = 'н/д'; mainPartyDiffValue.style.color = ''; }
                const plusLabel = infoElement.querySelector('.faceit-mainparty-average-elo-plus-label');
                const plusNumberElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-number');
                const plusPlayersElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-players');
                if (plusLabel) plusLabel.textContent = '';
                if (plusNumberElement) plusNumberElement.textContent = '';
                if (plusPlayersElement) plusPlayersElement.textContent = '';
                infoElement.style.opacity = '0.6';
            } else {
                const baseAvg = result.average.toLocaleString('ru-RU');
                const plus100 = result.adjustedAverage.toLocaleString('ru-RU');
                titleElement.textContent = 'Среднее ELO лобби';
                // Число и количество игроков всегда отдельными элементами
                valueNumberElement.textContent = baseAvg;
                valuePlayersElement.textContent = `(${result.count} игроков)`;
                if (mainPartyDiffValue) {
                    mainPartyDiffValue.textContent = (result.eloDiff != null ? result.eloDiff : 0).toLocaleString('ru-RU');
                    mainPartyDiffValue.style.color = (result.eloDiff != null && result.eloDiff > CONFIG.ELO_DIFF_WARNING_THRESHOLD) ? '#e74c3c' : '#2ecc71';
                }
                const plusLabel = infoElement.querySelector('.faceit-mainparty-average-elo-plus-label');
                const plusNumberElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-number');
                const plusPlayersElement = infoElement.querySelector('.faceit-mainparty-average-elo-plus-players');
                if (plusLabel) plusLabel.textContent = '+100';
                if (plusNumberElement) plusNumberElement.textContent = plus100;
                if (plusPlayersElement) plusPlayersElement.textContent = `(${result.count} игроков)`;
                infoElement.style.opacity = '1';
                // Отключаем всплывающую подсказку, чтобы не мешала
                infoElement.removeAttribute('title');
            }

            // Если FACEIT пересобрал DOM (SPA/bfcache), переносим блок в актуальную строку карточек
            try {
                const headerRowNow = findBestMainPartyHeaderRow(container, partyControl);
                if (headerRowNow && infoElement.parentElement !== headerRowNow) {
                    const rowStyleNow = window.getComputedStyle(headerRowNow);
                    if (rowStyleNow.position === 'static') headerRowNow.style.position = 'relative';
                    headerRowNow.appendChild(infoElement); // appendChild перемещает, не дублирует
                }
            } catch (e) {}
            lastMainPartyResultKey = cacheKey;
        } catch (error) {
            console.error('Faceit Party Average Elo: Error updating main party display', error);
        }
    }

    // Ожидание появления элементов пати
    function waitForPartyElements() {
        const result = calculateAverageElo();
        if (result && result.count > 0) {
            return true;
        }
        return false;
    }

    // Инициализация с ожиданием загрузки
    function init() {
        // Ждем, пока body будет готов
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }

        try {
            // Создаем элемент отображения
            createDisplayElement();

            // Ждем загрузки элементов пати с повторными попытками
            let attempts = 0;
            const maxAttempts = CONFIG.INIT_MAX_ATTEMPTS; // кол-во попыток
            
            function tryFindParty() {
                attempts++;
                const found = waitForPartyElements();
                
                // Обновляем отображение и блоки ELO в любом случае
                runFullUpdate();
                
                if (!found && attempts < maxAttempts) {
                    // Продолжаем ждать
                    setTimeout(tryFindParty, CONFIG.INIT_RETRY_DELAY);
                } else {
                    // Начали периодическое обновление
                    if (updateInterval) {
                        clearInterval(updateInterval);
                    }
                    updateInterval = setInterval(runFullUpdate, CONFIG.UPDATE_INTERVAL);
                }
            }
            
            // Начинаем поиск через небольшую задержку
            setTimeout(tryFindParty, CONFIG.INIT_RETRY_DELAY);

            // Один раз запрашиваем разрешение на уведомления (с задержкой), чтобы при большой разнице эло показывались браузерные уведомления
            setTimeout(requestNotificationPermissionIfNeeded, 3000);
            // Многие браузеры показывают запрос только после действия пользователя — пробуем по первому клику
            const once = () => {
                requestNotificationPermissionIfNeeded();
                document.removeEventListener('click', once);
                document.removeEventListener('keydown', once);
            };
            document.addEventListener('click', once, { once: false, passive: true });
            document.addEventListener('keydown', once, { once: false, passive: true });

            // Обновляем при изменениях DOM с debounce (SPA навигация, подгрузка контента)
            let updateTimeout = null;
            const observer = new MutationObserver(() => {
                if (updateTimeout) clearTimeout(updateTimeout);
                updateTimeout = setTimeout(runFullUpdate, CONFIG.DOM_OBSERVER_DEBOUNCE);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
            });

            // SPA-навигация: при back/forward сбрасываем всё и принудительно перерисовываем
            window.addEventListener('popstate', () => {
                mainPartyDisplayElement = null;
                lastMainPartyResultKey = '';
                lastRunFullUpdatePathname = '';
                lastPathnameForNotify = '';
                matchmakingRetryCount = 0;
                lobbyRetryCount = 0;
                stopAggressivePolling();
                runFullUpdate();
                startAggressivePollingIfNeeded();
            });

            // SPA часто использует pushState/replaceState — перехватываем и триггерим обновление + опрос
            const origPush = history.pushState;
            const origReplace = history.replaceState;
            const onHistoryChange = () => {
                mainPartyDisplayElement = null;
                lastMainPartyResultKey = '';
                lastRunFullUpdatePathname = '';
                lastPathnameForNotify = '';
                matchmakingRetryCount = 0;
                lobbyRetryCount = 0;
                stopAggressivePolling();
                runFullUpdate();
                startAggressivePollingIfNeeded();
            };
            history.pushState = function() { origPush.apply(this, arguments); onHistoryChange(); };
            history.replaceState = function() { origReplace.apply(this, arguments); onHistoryChange(); };

            // Back-Forward Cache: при возврате по кнопке «Назад» браузер восстанавливает страницу из кеша (bfcache).
            // Страница НЕ перезагружается — JS «заморожен», DOM без наших блоков. Нужно принудительно перерисовать.
            window.addEventListener('pageshow', (e) => {
                if (!e.persisted) return;  // persisted = true только при восстановлении из bfcache
                mainPartyDisplayElement = null;
                lastMainPartyResultKey = '';
                lastRunFullUpdatePathname = '';
                lastPathnameForNotify = '';
                matchmakingRetryCount = 0;
                lobbyRetryCount = 0;
                stopAggressivePolling();
                runFullUpdate();
                startAggressivePollingIfNeeded();
            });

            // Вкладка снова видна — обновляем (переход между вкладками, минимизация окна)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    lastRunFullUpdatePathname = '';
                    runFullUpdate();
                    startAggressivePollingIfNeeded();
                }
            });
        } catch (error) {
            console.error('Faceit Party Average Elo error:', error);
        }
    }

    // Запуск при загрузке страницы
    function startScript() {
        // Ждем полной загрузки страницы
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Дополнительная задержка для React/Next.js приложений
                setTimeout(init, CONFIG.INIT_DELAY_LOADED);
            });
        } else {
            // Страница уже загружена, но ждем еще немного для динамического контента
            setTimeout(init, CONFIG.INIT_DELAY_LOADED);
        }
        
        // Также слушаем событие загрузки окна
        window.addEventListener('load', () => {
            setTimeout(init, CONFIG.INIT_DELAY_ON_LOAD);
        });
    }
    
    startScript();

})();
