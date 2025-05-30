// Variables del juego
let currentRow = 0;
let currentCol = 0;
let currentGuess = '';
let targetWord = '';
let gameOver = false;
let keyboardState = {}; // Para rastrear el estado de las teclas
let PALABRAS_POSIBLES = []; // Banco de palabras en español de 5 letras

// Cargar las palabras desde el archivo JSON
fetch('palabrasESP.json')
  .then(response => response.json())
  .then(data => {
    PALABRAS_POSIBLES = data.palabrasESP;
    // La selección de la palabra y el inicio del juego se moverán a showInstructionsModal
  })
  .catch(error => console.error('Error cargando las palabras:', error));

// Variables para el límite diario de palabras
const MAX_GAMES_PER_DAY = 2;
let gamesPlayedToday = 0;
let lastPlayedDate = '';
let instructionsShownToday = false; // Nueva variable para controlar si las instrucciones se han mostrado hoy

// Función para obtener la fecha actual en formato YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-11
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Función para cargar el estado del juego desde localStorage
function loadGameState() {
    const storedDate = localStorage.getItem('lastPlayedDate');
    const storedGames = parseInt(localStorage.getItem('gamesPlayedToday') || '0', 10);
    const storedInstructionsShown = localStorage.getItem('instructionsShownToday');
    const today = getTodayDate();

    if (storedDate === today) {
        lastPlayedDate = storedDate;
        gamesPlayedToday = storedGames;
        instructionsShownToday = storedInstructionsShown === 'true'; // Convertir a booleano
    } else {
        // Si es un nuevo día, resetear el contador de juegos y el flag de instrucciones
        lastPlayedDate = today;
        gamesPlayedToday = 0;
        instructionsShownToday = false; // Resetear para que las instrucciones se muestren de nuevo
        saveGameState(); // Guardar el nuevo estado
        // Enviar evento a Google Analytics: Reinicio diario
        if (typeof gtag === 'function') {
            gtag('event', 'game_reset', {
                'event_category': 'game_status',
                'event_label': 'daily_reset'
            });
        }
    }
}

// Función para guardar el estado del juego en localStorage
function saveGameState() {
    localStorage.setItem('lastPlayedDate', lastPlayedDate);
    localStorage.setItem('gamesPlayedToday', gamesPlayedToday);
    localStorage.setItem('instructionsShownToday', instructionsShownToday); // Guardar el estado de las instrucciones
}

// Función para mostrar un modal personalizado (para mensajes de fin de juego)
function showModal(message) {
    const modal = document.getElementById('myModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.textContent = message;
    modal.style.display = 'flex'; // Mostrar el modal
    // Enviar evento a Google Analytics: Modal mostrado
    if (typeof gtag === 'function') {
        gtag('event', 'modal_view', {
            'event_category': 'ui_interaction',
            'event_label': message
        });
    }
}

// Función para cerrar el modal (para mensajes de fin de juego)
function closeModal() {
    const modal = document.getElementById('myModal');
    modal.style.display = 'none';
    // Ocultar el botón cuando se cierre el modal
    document.getElementById('playAgainBtn').style.display = 'none';
    // Enviar evento a Google Analytics: Modal cerrado
    if (typeof gtag === 'function') {
        gtag('event', 'modal_close', {
            'event_category': 'ui_interaction',
            'event_label': 'modal_closed'
        });
    }
}

// NUEVA FUNCIÓN: Mostrar el modal de instrucciones
function showInstructionsModal() {
    const instructionsModal = document.getElementById('instructionsModal');
    instructionsModal.style.display = 'flex';
    // Enviar evento a Google Analytics: Modal de instrucciones mostrado
    if (typeof gtag === 'function') {
        gtag('event', 'instructions_modal_view', {
            'event_category': 'ui_interaction',
            'event_label': 'instructions_shown'
        });
    }
}

// NUEVA FUNCIÓN: Cerrar el modal de instrucciones e iniciar el juego
function closeInstructionsModal() {
    const instructionsModal = document.getElementById('instructionsModal');
    instructionsModal.style.display = 'none';
    instructionsShownToday = true; // Marcar que las instrucciones ya se mostraron hoy
    saveGameState(); // Guardar el estado actualizado

    // Iniciar el juego después de cerrar las instrucciones
    initBoard();
    initKeyboard();
    if (gamesPlayedToday >= MAX_GAMES_PER_DAY) {
        showModal(`¡Bienvenido de vuelta!\n\nYa completaste tus ${MAX_GAMES_PER_DAY} palabras de hoy.\nVuelve mañana para más desafíos.`);
        gameOver = true;
    } else {
        selectRandomWord();
        const remainingGames = MAX_GAMES_PER_DAY - gamesPlayedToday;
        showMessage(`¡Adivina la palabra de 5 letras! (${remainingGames} ${remainingGames === 1 ? 'palabra' : 'palabras'} restantes hoy)`);
        // Enviar evento a Google Analytics: Juego iniciado
        if (typeof gtag === 'function') {
            gtag('event', 'game_start', {
                'event_category': 'game_status',
                'event_label': 'new_game'
            });
        }
    }
}


// Seleccionar palabra aleatoria al iniciar
function selectRandomWord() {
    const randomIndex = Math.floor(Math.random() * PALABRAS_POSIBLES.length);
    targetWord = PALABRAS_POSIBLES[randomIndex];
    // console.log('Palabra secreta:', targetWord); // Para debugging (quitar en producción)
}

// Verificar si una palabra existe en el diccionario
function isValidWord(word) {
    return PALABRAS_POSIBLES.includes(word.toUpperCase());
}

// Inicializar el tablero
function initBoard() {
    const board = document.getElementById('board');
    board.innerHTML = ''; // Limpiar el tablero antes de inicializar

    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.id = `row-${i}`;

        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}-${j}`;
            row.appendChild(cell);
        }

        board.appendChild(row);
    }
}

// Función para agregar una letra al tablero
function addLetter(letter) {
    if (gameOver || gamesPlayedToday >= MAX_GAMES_PER_DAY) return; // No permitir jugar si el límite se ha alcanzado

    if (currentCol < 5) {
        const cell = document.getElementById(`cell-${currentRow}-${currentCol}`);
        cell.textContent = letter.toUpperCase();
        currentGuess += letter.toUpperCase();
        currentCol++;

        // Agregar animación de escritura
        cell.style.animation = 'pop 0.1s ease-in-out';
        setTimeout(() => {
            cell.style.animation = '';
        }, 100);

        // Enviar evento a Google Analytics: Tecla presionada
        if (typeof gtag === 'function') {
            gtag('event', 'key_press', {
                'event_category': 'game_interaction',
                'event_label': 'letter_typed',
                'key': letter.toUpperCase()
            });
        }
    }
}

// Función para eliminar una letra
function deleteLetter() {
    if (gameOver || gamesPlayedToday >= MAX_GAMES_PER_DAY) return; // No permitir jugar si el límite se ha alcanzado

    if (currentCol > 0) {
        currentCol--;
        const cell = document.getElementById(`cell-${currentRow}-${currentCol}`);
        cell.textContent = '';
        currentGuess = currentGuess.slice(0, -1);
        // Enviar evento a Google Analytics: Tecla Backspace presionada
        if (typeof gtag === 'function') {
            gtag('event', 'key_press', {
                'event_category': 'game_interaction',
                'event_label': 'backspace_pressed'
            });
        }
    }
}

// Función para evaluar la palabra y colorear las celdas
function evaluateGuess() {
    const guess = currentGuess;
    const target = targetWord;
    const result = [];

    // Crear array para marcar letras ya utilizadas
    const targetLetters = target.split('');
    const usedPositions = new Array(5).fill(false);

    // Primera pasada: marcar letras correctas (verdes)
    for (let i = 0; i < 5; i++) {
        if (guess[i] === target[i]) {
            result[i] = 'correct';
            usedPositions[i] = true;
        }
    }

    // Segunda pasada: marcar letras en posición incorrecta (amarillas) y incorrectas (grises)
    for (let i = 0; i < 5; i++) {
        if (result[i] !== 'correct') {
            let found = false;
            for (let j = 0; j < 5; j++) {
                if (!usedPositions[j] && guess[i] === target[j] && result[j] !== 'correct') {
                    result[i] = 'present';
                    usedPositions[j] = true;
                    found = true;
                    break;
                }
            }
            if (!found) {
                result[i] = 'absent';
            }
        }
    }

    return result;
}

// Función para actualizar el estado del teclado visual
function updateKeyboardState(letter, state) {
    const currentState = keyboardState[letter];

    // Solo actualizar si el nuevo estado es "mejor" que el actual
    if (!currentState ||
        (currentState === 'absent' && (state === 'present' || state === 'correct')) ||
        (currentState === 'present' && state === 'correct')) {
        
        keyboardState[letter] = state;

        // Actualizar visualmente la tecla
        const keyElement = document.querySelector(`[data-key="${letter.toLowerCase()}"]`);
        
        if (keyElement) {
            keyElement.classList.remove('correct', 'present', 'absent');
            keyElement.classList.add(state);
        }
    }
}

// Función para colorear las celdas según el resultado
function colorCells(result, guessSnapshot) {
    for (let i = 0; i < 5; i++) {
        const cell = document.getElementById(`cell-${currentRow}-${i}`);

        setTimeout(() => {
            cell.style.animation = 'flip 0.6s ease-in-out';

            setTimeout(() => {
                if (result[i] === 'correct') {
                    cell.style.backgroundColor = '#6aaa64';
                    cell.style.borderColor = '#6aaa64';
                } else if (result[i] === 'present') {
                    cell.style.backgroundColor = '#c9b458';
                    cell.style.borderColor = '#c9b458';
                } else {
                    cell.style.backgroundColor = '#787c7e';
                    cell.style.borderColor = '#787c7e';
                }
                cell.style.color = 'white';

                const letter = guessSnapshot[i]; // <<< USAMOS EL SNAPSHOT
                updateKeyboardState(letter, result[i]);
            }, 300);
        }, i * 100);
    }
}


// Función para procesar Enter
function submitGuess() {
    if (gameOver) return;
    if (gamesPlayedToday >= MAX_GAMES_PER_DAY) {
        showModal(`Has alcanzado el límite de ${MAX_GAMES_PER_DAY} palabras por día. Vuelve mañana.`);
        return;
    }

    if (currentGuess.length === 5) {
        if (isValidWord(currentGuess)) {
            const result = evaluateGuess();
            const guessSnapshot = currentGuess;
            colorCells(result, guessSnapshot); 

            // Enviar evento a Google Analytics: Intento de palabra válido
            if (typeof gtag === 'function') {
                gtag('event', 'word_guess', {
                    'event_category': 'game_interaction',
                    'event_label': 'valid_guess',
                    'word': currentGuess.toUpperCase(),
                    'row': currentRow + 1,
                    'result': result.join(',')
                });
            }

            // En caso de ganar:
            if (currentGuess === targetWord) {
                setTimeout(() => {
                    gamesPlayedToday++;
                    saveGameState();
                    
                    let message;
                    if (gamesPlayedToday >= MAX_GAMES_PER_DAY) {
                        message = `¡Felicidades! La palabra era ${targetWord}\n\n¡Has completado tus ${MAX_GAMES_PER_DAY} palabras del día!\nVuelve mañana para más desafíos.`;
                    } else {
                        message = `¡Felicidades! La palabra era ${targetWord}\n\nTe queda ${MAX_GAMES_PER_DAY - gamesPlayedToday} palabra más hoy.`;
                        document.getElementById('playAgainBtn').style.display = 'block';
                    }
                    
                    showModal(message);
                    gameOver = true;
                    
                    // Google Analytics code...
                }, 2000);
            }

            // En caso de perder:
            else if (currentRow === 5) {
                setTimeout(() => {
                    gamesPlayedToday++;
                    saveGameState();
                    
                    let message;
                    if (gamesPlayedToday >= MAX_GAMES_PER_DAY) {
                        message = `La palabra era: ${targetWord}\n\n¡Has completado tus ${MAX_GAMES_PER_DAY} palabras del día!\nVuelve mañana para más desafíos.`;
                    } else {
                        message = `Lo sentimos. La palabra era: ${targetWord}\n\nTe queda ${MAX_GAMES_PER_DAY - gamesPlayedToday} palabra más hoy.`;
                        document.getElementById('playAgainBtn').style.display = 'block';
                    }
                    
                    showModal(message);
                    gameOver = true;
                    
                    // Google Analytics code...
                }, 2000);
            }
            
            // Preparar siguiente intento
            currentRow++;
            currentCol = 0;
            currentGuess = '';
        } else {
            showMessage('Palabra no válida');
            // Enviar evento a Google Analytics: Intento de palabra inválido
            if (typeof gtag === 'function') {
                gtag('event', 'word_guess', {
                    'event_category': 'game_interaction',
                    'event_label': 'invalid_guess',
                    'word': currentGuess.toUpperCase()
                });
            }
        }
    } else {
        showMessage('La palabra debe tener 5 letras');
    }
}

// Función para mostrar mensajes temporales en el div de mensajes
function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    setTimeout(() => {
        if (!gameOver) {
            messageEl.textContent = '';
        }
    }, 2000);
}

// Función para manejar clics en el teclado virtual
function handleKeyboardClick(key) {
    if (key === 'enter') {
        submitGuess();
    } else if (key === 'backspace') {
        deleteLetter();
    } else if (key >= 'a' && key <= 'z' || key === 'ñ') {
        addLetter(key);
    }
    // Enviar evento a Google Analytics: Clic en tecla virtual
    if (typeof gtag === 'function') {
        gtag('event', 'virtual_key_click', {
            'event_category': 'game_interaction',
            'event_label': key.toUpperCase()
        });
    }
}

// Capturar teclas del teclado físico
document.addEventListener('keydown', function(event) {
    const key = event.key.toLowerCase();
    
    // Prevenir comportamiento por defecto para teclas especiales
    if (key === 'backspace' || key === 'enter') {
        event.preventDefault();
    }
    
    // Solo permitir letras del alfabeto español
    if ((key >= 'a' && key <= 'z' || key === 'ñ') && key.length === 1) {
        addLetter(key);
    }
    // Tecla Backspace para borrar
    else if (key === 'backspace') {
        deleteLetter();
    }
    // Tecla Enter para enviar
    else if (key === 'enter') {
        submitGuess();
    }
    // Enviar evento a Google Analytics: Tecla física presionada
    if (typeof gtag === 'function') {
        gtag('event', 'physical_key_press', {
            'event_category': 'game_interaction',
            'event_label': key.toUpperCase()
        });
    }
});

// Agregar event listeners al teclado virtual
function initKeyboard() {
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.addEventListener('click', () => {
            const keyValue = key.getAttribute('data-key');
            handleKeyboardClick(keyValue);
        });
    });
}

// Inicializar el juego cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    loadGameState(); // Cargar el estado del juego al inicio

    // Si las palabras aún no se han cargado, esperar a que se carguen
    if (PALABRAS_POSIBLES.length === 0) {
        // Usar un temporizador o un MutationObserver si la carga es asíncrona y no hay un evento específico
        // Para este caso, como fetch ya maneja la promesa, el código dentro del .then() se ejecutará
        // después de que PALABRAS_POSIBLES esté lleno.
        // Aquí, simplemente aseguramos que la lógica de inicio se ejecute después del fetch.
        // El fetch ya llama a selectRandomWord, pero la lógica de mostrar instrucciones
        // y el inicio del juego se manejan aquí.
        fetch('palabrasESP.json')
            .then(response => response.json())
            .then(data => {
                PALABRAS_POSIBLES = data.palabrasESP;
                // Ahora que las palabras están cargadas, decidir si mostrar instrucciones o iniciar el juego
                if (!instructionsShownToday) {
                    showInstructionsModal();
                } else {
                    closeInstructionsModal(); // Esto iniciará el juego directamente
                }
            })
            .catch(error => console.error('Error cargando las palabras:', error));
    } else {
        // Si las palabras ya están cargadas (ej. por recarga rápida o caché)
        if (!instructionsShownToday) {
            showInstructionsModal();
        } else {
            closeInstructionsModal(); // Esto iniciará el juego directamente
        }
    }

    // Configurar el botón de cierre del modal de fin de juego
    document.querySelector('#myModal .close-button').addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('myModal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // Configurar el botón "Jugar de nuevo" del modal de fin de juego
    document.getElementById('playAgainBtn').addEventListener('click', resetGame);

    // Configurar los botones del nuevo modal de instrucciones
    document.getElementById('closeInstructions').addEventListener('click', closeInstructionsModal);
    document.getElementById('startGameBtn').addEventListener('click', closeInstructionsModal);
});


// Función para resetear el juego
function resetGame() {
    currentRow = 0;
    currentCol = 0;
    currentGuess = '';
    gameOver = false;
    keyboardState = {};
    
    // Limpiar el tablero
    initBoard();
    
    // Resetear el teclado visual
    const keys = document.querySelectorAll('.key');
    keys.forEach(key => {
        key.classList.remove('correct', 'present', 'absent');
    });
    
    // Seleccionar nueva palabra
    selectRandomWord();
    
    // Mostrar mensaje inicial
    showMessage('¡Adivina la palabra de 5 letras!');
    
    // Cerrar modal de fin de juego
    closeModal();
}
