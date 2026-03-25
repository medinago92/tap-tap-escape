// ------------------------------
// Referencias a elementos HTML
// ------------------------------
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const finalScoreEl = document.getElementById("finalScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");

// ------------------------------
// Configuración del juego
// ------------------------------
const LANES = 3;
const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const LANE_WIDTH = GAME_WIDTH / LANES;

const PLAYER_WIDTH = 52;
const PLAYER_HEIGHT = 52;
const PLAYER_Y = GAME_HEIGHT - 90;

const OBSTACLE_WIDTH = 58;
const OBSTACLE_HEIGHT = 58;
const BASE_OBSTACLE_SPEED = 220; // píxeles por segundo
const SPAWN_INTERVAL = 700; // ms

// ------------------------------
// Estado del juego
// ------------------------------
let currentLane = 1; // empieza en el carril central
let obstacles = [];
let score = 0;
let highScore = Number(localStorage.getItem("tapTapEscapeHighScore")) || 0;
let gameRunning = false;
let gameOver = false;
let lastTime = 0;
let spawnTimer = 0;

highScoreEl.textContent = String(highScore);

// ------------------------------
// Funciones utilitarias
// ------------------------------
function laneToX(laneIndex, itemWidth) {
  return laneIndex * LANE_WIDTH + LANE_WIDTH / 2 - itemWidth / 2;
}

function clampLane(value) {
  return Math.max(0, Math.min(LANES - 1, value));
}

function updateScore(points) {
  score += points;
  scoreEl.textContent = String(score);

  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = String(highScore);
    localStorage.setItem("tapTapEscapeHighScore", String(highScore));
  }
}

// ------------------------------
// Dibujado
// ------------------------------
function drawBackground() {
  // Fondo principal
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Carriles
  for (let i = 1; i < LANES; i += 1) {
    const x = i * LANE_WIDTH;
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 14]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawPlayer() {
  const x = laneToX(currentLane, PLAYER_WIDTH);

  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);

  // Detalle simple para que parezca personaje
  ctx.fillStyle = "#082f49";
  ctx.fillRect(x + 10, PLAYER_Y + 12, 10, 10);
  ctx.fillRect(x + PLAYER_WIDTH - 20, PLAYER_Y + 12, 10, 10);
}

function drawObstacles() {
  ctx.fillStyle = "#f87171";
  for (const obstacle of obstacles) {
    const x = laneToX(obstacle.lane, OBSTACLE_WIDTH);
    ctx.fillRect(x, obstacle.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
  }
}

function render() {
  drawBackground();
  drawPlayer();
  drawObstacles();
}

// ------------------------------
// Lógica del juego
// ------------------------------
function spawnObstacle() {
  const lane = Math.floor(Math.random() * LANES);
  obstacles.push({
    lane,
    y: -OBSTACLE_HEIGHT,
    passed: false,
  });
}

function checkCollision(playerX, obstacleX, obstacleY) {
  return (
    playerX < obstacleX + OBSTACLE_WIDTH &&
    playerX + PLAYER_WIDTH > obstacleX &&
    PLAYER_Y < obstacleY + OBSTACLE_HEIGHT &&
    PLAYER_Y + PLAYER_HEIGHT > obstacleY
  );
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  finalScoreEl.textContent = String(score);
  gameOverScreen.classList.add("show");
}

function update(deltaTime) {
  const playerX = laneToX(currentLane, PLAYER_WIDTH);
  const speed = BASE_OBSTACLE_SPEED + score * 2;

  // Generar obstáculos con temporizador
  spawnTimer += deltaTime * 1000;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnObstacle();
  }

  // Mover obstáculos y revisar colisiones
  for (const obstacle of obstacles) {
    obstacle.y += speed * deltaTime;

    const obstacleX = laneToX(obstacle.lane, OBSTACLE_WIDTH);
    if (checkCollision(playerX, obstacleX, obstacle.y)) {
      endGame();
      return;
    }

    // Puntuar cuando el obstáculo ya pasó al jugador
    if (!obstacle.passed && obstacle.y > PLAYER_Y + PLAYER_HEIGHT) {
      obstacle.passed = true;
      updateScore(1);
    }
  }

  // Limpiar obstáculos que ya salieron de pantalla
  obstacles = obstacles.filter((obstacle) => obstacle.y < GAME_HEIGHT + OBSTACLE_HEIGHT);
}

function gameLoop(timestamp) {
  if (!gameRunning) {
    render();
    return;
  }

  // Delta time en segundos
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(deltaTime);
  render();

  if (gameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

function resetGameState() {
  currentLane = 1;
  obstacles = [];
  score = 0;
  spawnTimer = 0;
  gameOver = false;
  scoreEl.textContent = "0";
}

function startGame() {
  resetGameState();
  startScreen.classList.remove("show");
  gameOverScreen.classList.remove("show");
  gameRunning = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ------------------------------
// Controles
// ------------------------------
function moveLeft() {
  currentLane = clampLane(currentLane - 1);
}

function moveRight() {
  currentLane = clampLane(currentLane + 1);
}

function switchLaneTap() {
  // En cada toque/clic alternamos de forma simple: centro->izq->der->centro...
  if (currentLane === 1) {
    currentLane = 0;
  } else if (currentLane === 0) {
    currentLane = 2;
  } else {
    currentLane = 1;
  }
}

function handleActionInput(event) {
  // Evita scroll al tocar espacio/flechas en móvil/desktop
  if (event) event.preventDefault();

  if (!gameRunning && !gameOver) {
    startGame();
    return;
  }

  if (gameRunning) {
    switchLaneTap();
  }
}

canvas.addEventListener("click", handleActionInput);
canvas.addEventListener("touchstart", handleActionInput, { passive: false });

window.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === " " || key === "Spacebar") {
    handleActionInput(event);
    return;
  }

  if (!gameRunning) return;

  if (key === "ArrowLeft") {
    event.preventDefault();
    moveLeft();
  } else if (key === "ArrowRight") {
    event.preventDefault();
    moveRight();
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

// Primer render para mostrar pantalla inicial
render();