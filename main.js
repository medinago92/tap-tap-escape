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
const BASE_OBSTACLE_SPEED = 180;
const MAX_OBSTACLE_SPEED = 360;
const SPEED_GROWTH_PER_POINT = 1.4;
const SPAWN_INTERVAL = 700;

const COIN_WIDTH = 30;
const COIN_HEIGHT = 30;
const COIN_SPEED_MULTIPLIER = 0.68;
const COIN_SPAWN_INTERVAL = 1900;
const COIN_SAFE_DISTANCE_Y = 130;
const COIN_POINTS = 3;

const LANE_FLASH_DURATION = 120;

// ------------------------------
// Estado del juego
// ------------------------------
let currentLane = 1;
let obstacles = [];
let coins = [];
let effects = [];

let score = 0;
let highScore = Number(localStorage.getItem("tapTapEscapeHighScore")) || 0;

let gameRunning = false;
let gameOver = false;
let lastTime = 0;
let spawnTimer = 0;
let coinSpawnTimer = 0;
let laneFlashUntil = 0;

highScoreEl.textContent = String(highScore);

// ------------------------------
// Utilidades
// ------------------------------
function laneToX(laneIndex, itemWidth) {
  return laneIndex * LANE_WIDTH + LANE_WIDTH / 2 - itemWidth / 2;
}

function clampLane(value) {
  return Math.max(0, Math.min(LANES - 1, value));
}

function triggerLaneFlash() {
  laneFlashUntil = performance.now() + LANE_FLASH_DURATION;
}

function moveLane(direction) {
  const nextLane = clampLane(currentLane + direction);
  if (nextLane !== currentLane) {
    currentLane = nextLane;
    triggerLaneFlash();
  }
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

function getObstacleSpeed() {
  const speed = BASE_OBSTACLE_SPEED + score * SPEED_GROWTH_PER_POINT;
  return Math.min(speed, MAX_OBSTACLE_SPEED);
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// ------------------------------
// Dibujado
// ------------------------------
function drawBackground() {
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

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

  if (performance.now() < laneFlashUntil) {
    const flashX = currentLane * LANE_WIDTH;
    ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
    ctx.fillRect(flashX, 0, LANE_WIDTH, GAME_HEIGHT);
  }
}

function drawPlayer() {
  const x = laneToX(currentLane, PLAYER_WIDTH);

  ctx.fillStyle = "#22d3ee";
  ctx.fillRect(x, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT);

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

function drawCoins() {
  for (const coin of coins) {
    const x = laneToX(coin.lane, COIN_WIDTH);
    const centerX = x + COIN_WIDTH / 2;
    const centerY = coin.y + COIN_HEIGHT / 2;

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(centerX, centerY, COIN_WIDTH / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(120, 53, 15, 0.55)";
    ctx.beginPath();
    ctx.arc(centerX, centerY, COIN_WIDTH / 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects() {
  for (const effect of effects) {
    ctx.strokeStyle = `rgba(250, 204, 21, ${effect.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function render() {
  drawBackground();
  drawPlayer();
  drawObstacles();
  drawCoins();
  drawEffects();
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

function canSpawnCoinAtLane(lane) {
  const coinSpawnY = -COIN_HEIGHT;
  const topZoneLimitY = 260;

  for (const coin of coins) {
    if (coin.lane !== lane) continue;
    if (coin.y > topZoneLimitY) continue;

    const distanceY = Math.abs(coin.y - coinSpawnY);
    if (distanceY < COIN_SAFE_DISTANCE_Y) {
      return false;
    }
  }

  for (const obstacle of obstacles) {
    if (obstacle.lane !== lane) continue;
    if (obstacle.y > topZoneLimitY) continue;

    const distanceY = Math.abs(obstacle.y - coinSpawnY);
    if (distanceY < COIN_SAFE_DISTANCE_Y) {
      return false;
    }
  }

  return true;
}

function spawnCoin() {
  if (Math.random() < 0.5) return;

  const lanes = [0, 1, 2];

  for (let i = lanes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
  }

  for (const lane of lanes) {
    if (canSpawnCoinAtLane(lane)) {
      coins.push({
        lane,
        y: -COIN_HEIGHT,
        collected: false,
      });
      return;
    }
  }
}

function createCoinCollectEffect(coinX, coinY) {
  effects.push({
    x: coinX + COIN_WIDTH / 2,
    y: coinY + COIN_HEIGHT / 2,
    radius: 8,
    alpha: 0.9,
  });
}

function endGame() {
  gameRunning = false;
  gameOver = true;
  finalScoreEl.textContent = String(score);
  gameOverScreen.classList.add("show");
}

function update(deltaTime) {
  const playerX = laneToX(currentLane, PLAYER_WIDTH);
  const playerRect = {
    x: playerX,
    y: PLAYER_Y,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
  };

  const speed = getObstacleSpeed();
  const coinSpeed = speed * COIN_SPEED_MULTIPLIER;

  spawnTimer += deltaTime * 1000;
  if (spawnTimer >= SPAWN_INTERVAL) {
    spawnTimer = 0;
    spawnObstacle();
  }

  coinSpawnTimer += deltaTime * 1000;
  if (coinSpawnTimer >= COIN_SPAWN_INTERVAL) {
    coinSpawnTimer = 0;
    spawnCoin();
  }

  for (const obstacle of obstacles) {
    obstacle.y += speed * deltaTime;

    const obstacleX = laneToX(obstacle.lane, OBSTACLE_WIDTH);
    const obstacleRect = {
      x: obstacleX,
      y: obstacle.y,
      width: OBSTACLE_WIDTH,
      height: OBSTACLE_HEIGHT,
    };

    if (rectanglesOverlap(playerRect, obstacleRect)) {
      endGame();
      return;
    }

    if (!obstacle.passed && obstacle.y > PLAYER_Y + PLAYER_HEIGHT) {
      obstacle.passed = true;
      updateScore(1);
    }
  }

  for (const coin of coins) {
    coin.y += coinSpeed * deltaTime;

    const coinX = laneToX(coin.lane, COIN_WIDTH);
    const coinRect = {
      x: coinX,
      y: coin.y,
      width: COIN_WIDTH,
      height: COIN_HEIGHT,
    };

    if (!coin.collected && rectanglesOverlap(playerRect, coinRect)) {
      coin.collected = true;
      createCoinCollectEffect(coinX, coin.y);
      updateScore(COIN_POINTS);
    }
  }

  for (const effect of effects) {
    effect.radius += 180 * deltaTime;
    effect.alpha -= 4 * deltaTime;
  }

  obstacles = obstacles.filter(
    (obstacle) => obstacle.y < GAME_HEIGHT + OBSTACLE_HEIGHT
  );

  coins = coins.filter(
    (coin) => !coin.collected && coin.y < GAME_HEIGHT + COIN_HEIGHT
  );

  effects = effects.filter((effect) => effect.alpha > 0);
}

function gameLoop(timestamp) {
  if (!gameRunning) {
    render();
    return;
  }

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
  coins = [];
  effects = [];
  score = 0;
  spawnTimer = 0;
  coinSpawnTimer = 0;
  gameOver = false;
  laneFlashUntil = 0;
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
function handleCanvasAction(clientX) {
  const rect = canvas.getBoundingClientRect();
  const xInsideCanvas = clientX - rect.left;

  if (!gameRunning && !gameOver) {
    startGame();
    return;
  }

  if (!gameRunning) return;

  if (xInsideCanvas < rect.width / 2) {
    moveLane(-1);
  } else {
    moveLane(1);
  }
}

canvas.addEventListener("click", (event) => {
  event.preventDefault();
  handleCanvasAction(event.clientX);
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    if (touch) {
      handleCanvasAction(touch.clientX);
    }
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  const key = event.key;

  if (key === " ") {
    event.preventDefault();
    if (!gameRunning && !gameOver) {
      startGame();
    }
    return;
  }

  if (!gameRunning) return;

  if (key === "ArrowLeft") {
    event.preventDefault();
    moveLane(-1);
  } else if (key === "ArrowRight") {
    event.preventDefault();
    moveLane(1);
  }
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

render();