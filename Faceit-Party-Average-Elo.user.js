// ==UserScript==
// @name         Faceit Party Average Elo
// @namespace    http://tampermonkey.net/
// @version      1.2
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
        // === ОБЩИЕ ТАЙМИНГИ ===
        UPDATE_INTERVAL: 500,               // Как часто пересчитывать и обновлять все значения (мс)
        INIT_DELAY_LOADED: 1000,            // Задержка перед первым init, если DOM уже готов (мс)
        INIT_DELAY_ON_LOAD: 1000,           // Доп. задержка после события window.load (мс)
        INIT_RETRY_DELAY: 500,              // Пауза между попытками найти пати и начать работу (мс)
        INIT_MAX_ATTEMPTS: 30,              // Сколько всего попыток искать пати при старте
        DOM_OBSERVER_DEBOUNCE: 300,         // Задержка перед реакцией на изменения DOM (мс)

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

            LINE_MARGIN: '2px'                // Отступы между линиями и строками текста
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

            LINE_MARGIN: '2px'                 // Отступы между линиями и строками
        }
    };

    // === СЕЛЕКТОРЫ ДЛЯ ПОИСКА ЭЛЕМЕНТОВ ===
    const SELECTORS = {
        // Контейнер пати (более широкий поиск)
        PARTY_CONTAINER: [
            'section[class*="Container-sc-c9a9cc81-0"]',
            'section[class*="Container"]',
            'div[class*="CardContainer-sc-c9a9cc81-1"]',
            'div[class*="CardContainer"]',
            'div[class*="PartyControl"]',
            '[class*="Party__"]'
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

    // === ОСНОВНЫЕ ФУНКЦИИ ===
    
    // Поиск контейнера пати (ищем по всей странице)
    function findPartyContainer() {
        // Сначала ищем по точным селекторам
        for (const selector of SELECTORS.PARTY_CONTAINER) {
            try {
                const containers = document.querySelectorAll(selector);
                for (const container of containers) {
                    // Проверяем, есть ли внутри карточки игроков с ELO
                    for (const cardSelector of SELECTORS.PLAYER_CARDS) {
                        const playerCards = container.querySelectorAll(cardSelector);
                        if (playerCards.length > 0) {
                            // Проверяем, что хотя бы одна карточка имеет ELO
                            for (const card of playerCards) {
                                if (extractEloFromCard(card) !== null) {
                                    return container;
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                continue;
            }
        }
        
        // Если не нашли по контейнеру, ищем карточки напрямую по всей странице
        for (const cardSelector of SELECTORS.PLAYER_CARDS) {
            try {
                const cards = document.querySelectorAll(cardSelector);
                if (cards.length > 0) {
                    // Проверяем, что хотя бы одна карточка имеет ELO
                    for (const card of cards) {
                        if (extractEloFromCard(card) !== null) {
                            // Возвращаем родительский контейнер
                            let parent = card.parentElement;
                            while (parent && parent !== document.body) {
                                if (parent.tagName === 'SECTION' || parent.classList.toString().includes('Container')) {
                                    return parent;
                                }
                                parent = parent.parentElement;
                            }
                            return card.closest('section') || card.closest('div[class*="Container"]') || document.body;
                        }
                    }
                }
            } catch (e) {
                continue;
            }
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

        // Ищем ELO текст в карточке - сначала ищем в Tag__Container
        const tagContainer = card.querySelector('[class*="Tag__Container"]');
        if (tagContainer) {
            const eloElement = tagContainer.querySelector('span[class*="EloText"], span[class*="Elo"]');
            if (eloElement) {
                const eloText = eloElement.textContent.trim();
                // Убираем запятые и пробелы, оставляем только цифры
                const eloNumber = parseInt(eloText.replace(/[,\s]/g, ''), 10);
                if (!isNaN(eloNumber) && eloNumber > 0 && eloNumber < 10000) {
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
                if (!isNaN(eloNumber) && eloNumber > 0 && eloNumber < 10000) {
                    return eloNumber;
                }
            }
        }

        // Альтернативный поиск: ищем числа в тексте карточки
        const cardText = card.textContent || '';
        // Ищем паттерны типа "693", "1,667", "2,131" (3-4 цифры, возможно с запятыми)
        const eloMatches = cardText.match(/\b(\d{1,3}(?:[,\s]\d{3})*)\b/g);
        if (eloMatches && eloMatches.length > 0) {
            // Берем последнее число (обычно ELO находится в конце карточки)
            const lastMatch = eloMatches[eloMatches.length - 1];
            const eloNumber = parseInt(lastMatch.replace(/[,\s]/g, ''), 10);
            if (!isNaN(eloNumber) && eloNumber > 0 && eloNumber < 10000) {
                return eloNumber;
            }
        }

        return null;
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

            return {
            average: roundedAverage,
            adjustedAverage: adjustedAverage,
                count: eloValues.length,
                values: eloValues
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
        // Оставляем только расчёт в логах на будущее, визуально ничего не рисуем
        try {
            const result = calculateAverageElo();
            if (!result) return;
        } catch (error) {
            console.error('Faceit Party Average Elo: Error updating display', error);
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
            // На странице матчмейкинга используем отдельный блок справа,
            // чтобы не было второго окна слева.
            if (window.location.pathname.includes('/matchmaking')) {
                return;
            }

            const lobbyContainers = findLobbyContainers();
            if (!lobbyContainers || lobbyContainers.length === 0) {
                return;
            }

            lobbyContainers.forEach(container => {
                const playerCards = findPlayerCards(container);
                const result = calculateAverageEloForCards(playerCards);

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
                    if (!titleElement || !valueContainer || !valueNumberElement || !valuePlayersElement ||
                        !plusLabel || !plusValueContainer || !plusNumberElement || !plusPlayersElement ||
                        !topLine || !middleLine || !bottomLine) {
                        infoElement.innerHTML = '';
                        const newTop = document.createElement('div');
                        newTop.className = 'faceit-lobby-average-elo-line-top';
                        newTop.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.LOBBY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.LOBBY_BLOCK.LINE_MARGIN};`;

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

                if (!result) {
                    titleElement.textContent = 'Среднее ELO лобби';
                    valueNumberElement.textContent = 'н/д';
                    valuePlayersElement.textContent = '';
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
            });
        } catch (error) {
            console.error('Faceit Party Average Elo: Error updating lobby displays', error);
        }
    }

    // Отображение среднего ELO для текущей пати на главной странице (matchmaking)
    function updateMainPartyDisplay() {
        try {
            // Работаем только на странице матчмейкинга
            if (!window.location.pathname.includes('/matchmaking')) {
                const old = document.querySelector('.faceit-mainparty-average-elo');
                if (old && old.parentElement) {
                    old.parentElement.removeChild(old);
                }
                mainPartyDisplayElement = null;
                return;
            }

            const container = findPartyContainer();
            if (!container) return;

            const playerCards = findPlayerCards(container);
            const result = calculateAverageEloForCards(playerCards);

            // Ищем хедер пати (PartyControl)
            const partyControl =
                container.querySelector('[class*="PartyControl__Container"]') ||
                container.querySelector('[class*="PartyControl__Holder"]') ||
                container.querySelector('[class*="styles__PartyControlContainer"]') ||
                container;

            // Используем один глобальный элемент, чтобы не плодить бесконечно новые дивы
            let infoElement = mainPartyDisplayElement && document.body.contains(mainPartyDisplayElement)
                ? mainPartyDisplayElement
                : null;
            let titleElement;
            let valueNumberElement;
            let valuePlayersElement;

            if (!infoElement) {
                infoElement = document.createElement('div');
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
                    pointer-events: none; /* чтобы не было никаких тултипов/ховеров */
                `;

                const topLine = document.createElement('div');
                topLine.className = 'faceit-mainparty-average-elo-line-top';
                topLine.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

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
                infoElement.appendChild(titleElement);
                infoElement.appendChild(middleLine);
                infoElement.appendChild(valueContainer);
                infoElement.appendChild(plusLabel);
                infoElement.appendChild(plusValueContainer);
                infoElement.appendChild(bottomLine);

                // Вставляем блок в строку с карточками игроков,
                // чтобы он выглядел так же, как в списке лобби.
                let headerRow = null;
                const firstPlayerCard =
                    container.querySelector('[class*="PlayerCardWrapper-sc-84becbd1-2"]') ||
                    container.querySelector('[class*="PlayerCardWrapper"]') ||
                    container.querySelector('[data-testid="playerCard"]');

                if (firstPlayerCard) {
                    headerRow =
                        firstPlayerCard.closest('[class*="CardContainer-sc-c9a9cc81-1"]') ||
                        firstPlayerCard.closest('[class*="CardContainer"]') ||
                        firstPlayerCard.parentElement;
                }

                if (!headerRow) {
                    // На всякий случай, если не нашли карточки, вешаем на PartyControl
                    headerRow = partyControl;
                }

                const rowStyle = window.getComputedStyle(headerRow);
                if (rowStyle.position === 'static') {
                    headerRow.style.position = 'relative';
                }

                headerRow.appendChild(infoElement);

                // Сохраняем для повторного использования
                mainPartyDisplayElement = infoElement;
            } else {
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
                if (!titleElement || !valueContainer || !valueNumberElement || !valuePlayersElement ||
                    !plusLabel || !plusValueContainer || !plusNumberElement || !plusPlayersElement ||
                    !topLine || !middleLine || !bottomLine) {
                    infoElement.innerHTML = '';
                    const newTop = document.createElement('div');
                    newTop.className = 'faceit-mainparty-average-elo-line-top';
                    newTop.style.cssText = `width: 100%; border-top: 1px solid ${CONFIG.MAIN_PARTY_BLOCK.BORDER_COLOR}; margin-bottom: ${CONFIG.MAIN_PARTY_BLOCK.LINE_MARGIN};`;

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

            if (!result) {
                titleElement.textContent = 'Среднее ELO лобби';
                valueNumberElement.textContent = 'н/д';
                valuePlayersElement.textContent = '';
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
                
                // Обновляем отображение в любом случае
                updateDisplay();
                
                if (!found && attempts < maxAttempts) {
                    // Продолжаем ждать
                    setTimeout(tryFindParty, CONFIG.INIT_RETRY_DELAY);
                } else {
                    // Начали периодическое обновление
                    if (updateInterval) {
                        clearInterval(updateInterval);
                    }
                    updateInterval = setInterval(() => {
                        updateDisplay();         // пати (расчет)
                        updateLobbyDisplays();   // лобби на странице клуба
                        updateMainPartyDisplay(); // главное лобби (matchmaking)
                    }, CONFIG.UPDATE_INTERVAL);
                }
            }
            
            // Начинаем поиск через небольшую задержку
            setTimeout(tryFindParty, CONFIG.INIT_RETRY_DELAY);

            // Обновляем при изменениях DOM с debounce
            let updateTimeout = null;
            const observer = new MutationObserver(() => {
                if (updateTimeout) {
                    clearTimeout(updateTimeout);
                }
                updateTimeout = setTimeout(() => {
                    updateDisplay();
                }, CONFIG.DOM_OBSERVER_DEBOUNCE);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: false
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
