(() => {
  "use strict";

  const DIRECTIONS = ["NORTH", "EAST", "SOUTH", "WEST"];
  const SIGNAL = { RED: "RED", AMBER: "AMBER", GREEN: "GREEN" };
  const DENSITY_LIMITS = { medium: 2, high: 4, queue: 4 };
  const VEHICLE_GAP = 43;
  const STOP_LINE_DISTANCE = 19;
  const PHASES = [
    { movement: "NORTH / SOUTH", green: [0, 2], duration: 19, state: SIGNAL.GREEN },
    { movement: "NORTH / SOUTH", green: [0, 2], duration: 4, state: SIGNAL.AMBER },
    { movement: "ALL RED", green: [], duration: 1.5, state: SIGNAL.RED },
    { movement: "EAST / WEST", green: [1, 3], duration: 19, state: SIGNAL.GREEN },
    { movement: "EAST / WEST", green: [1, 3], duration: 4, state: SIGNAL.AMBER },
    { movement: "ALL RED", green: [], duration: 1.5, state: SIGNAL.RED }
  ];
  const VEHICLE_COLORS = ["#b7a58e", "#8a9a91", "#a8a8a0", "#9b877f", "#8996a3", "#b7b4a6"];
  const APPROACH_LAYOUT = [
    { x: 390, y: (distance) => 196 - distance, rotation: 180 },
    { x: (distance) => 604 + distance, y: 283, rotation: -90 },
    { x: 510, y: (distance) => 404 + distance, rotation: 0 },
    { x: (distance) => 296 - distance, y: 367, rotation: 90 }
  ];

  // Parallel arrays use a shared direction index; vehicle queues hold the live vehicle objects.
  const signalStates = DIRECTIONS.map(() => SIGNAL.RED);
  const vehiclesByDirection = DIRECTIONS.map(() => []);
  const waitingVehicles = DIRECTIONS.map(() => 0);
  const vehiclesPassed = DIRECTIONS.map(() => 0);
  const trafficDensity = DIRECTIONS.map(() => "LOW");
  const arrivalIntervals = [4.8, 5.7, 5.1, 6.2];
  const arrivalClocks = [1.2, 3.4, 5.6, 2.8];

  const elements = {
    status: document.getElementById("simulation-status"),
    statusWrap: document.querySelector(".topbar-status"),
    clock: document.getElementById("simulation-clock"),
    activeMovement: document.getElementById("active-movement"),
    phaseRemaining: document.getElementById("phase-remaining"),
    controlState: document.getElementById("control-state"),
    start: document.getElementById("start-button"),
    pause: document.getElementById("pause-button"),
    resume: document.getElementById("resume-button"),
    reset: document.getElementById("reset-button"),
    speed: document.getElementById("speed-select"),
    directionSelect: document.getElementById("direction-select"),
    addVehicle: document.getElementById("add-vehicle-button"),
    addHint: document.getElementById("add-vehicle-hint"),
    totalWaiting: document.getElementById("total-waiting"),
    totalPassed: document.getElementById("total-passed"),
    averageWait: document.getElementById("average-wait"),
    directionTable: document.getElementById("direction-table"),
    arrayList: document.getElementById("array-list"),
    vehicleLayer: document.getElementById("vehicle-layer"),
    signalUnits: [...document.querySelectorAll(".signal-unit")]
  };

  let running = false;
  let elapsedSeconds = 0;
  let phaseIndex = 2;
  let phaseElapsed = 0;
  let nextVehicleId = 1;
  let completedWaitSeconds = 0;
  let lastFrame = 0;
  let animationFrame = 0;
  let renderAccumulator = 0;
  const vehiclesById = new Map();

  function formatClock(seconds) {
    const wholeSeconds = Math.floor(seconds);
    return `${String(Math.floor(wholeSeconds / 60)).padStart(2, "0")}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  }

  function densityFor(queueLength) {
    if (queueLength >= DENSITY_LIMITS.high) return "HIGH";
    if (queueLength >= DENSITY_LIMITS.medium) return "MEDIUM";
    return "LOW";
  }

  function applyPhase() {
    const phase = PHASES[phaseIndex];
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      signalStates[direction] = phase.green.includes(direction) ? phase.state : SIGNAL.RED;
    }
  }

  function updateQueuesAndDensity() {
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      waitingVehicles[direction] = vehiclesByDirection[direction]
        .filter((vehicle) => vehicle.position >= 0 && vehicle.speed === 0).length;
      trafficDensity[direction] = densityFor(vehiclesByDirection[direction].filter((vehicle) => vehicle.position >= 0).length);
    }
  }

  function createVehicle(direction, position) {
    const vehicle = {
      id: nextVehicleId,
      direction,
      position,
      speed: 0,
      waitSeconds: 0,
      color: VEHICLE_COLORS[(nextVehicleId - 1) % VEHICLE_COLORS.length]
    };
    nextVehicleId += 1;
    vehiclesByDirection[direction].push(vehicle);
    vehiclesById.set(vehicle.id, vehicle);
    return vehicle;
  }

  function addVehicle(direction) {
    const queue = vehiclesByDirection[direction];
    if (queue.filter((vehicle) => vehicle.position >= 0).length >= DENSITY_LIMITS.queue) {
      elements.addHint.textContent = `${DIRECTIONS[direction]} queue is at its limit.`;
      return false;
    }
    const vehiclesOnApproach = queue.filter((vehicle) => vehicle.position >= 0);
    const tail = vehiclesOnApproach.reduce((farthest, vehicle) => Math.max(farthest, vehicle.position), 120);
    const spawnPosition = elapsedSeconds === 0
      ? STOP_LINE_DISTANCE + vehiclesOnApproach.length * VEHICLE_GAP
      : Math.max(145, tail + VEHICLE_GAP);
    createVehicle(direction, spawnPosition);
    elements.addHint.textContent = `${DIRECTIONS[direction]} vehicle added.`;
    updateQueuesAndDensity();
    render();
    return true;
  }

  function advanceSignalCycle(deltaSeconds) {
    phaseElapsed += deltaSeconds;
    while (phaseElapsed >= PHASES[phaseIndex].duration) {
      phaseElapsed -= PHASES[phaseIndex].duration;
      phaseIndex = (phaseIndex + 1) % PHASES.length;
      applyPhase();
    }
  }

  function advanceArrivals(deltaSeconds) {
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      arrivalClocks[direction] -= deltaSeconds;
      if (arrivalClocks[direction] <= 0) {
        const countOnApproach = vehiclesByDirection[direction].filter((vehicle) => vehicle.position >= 0).length;
        if (countOnApproach < DENSITY_LIMITS.queue) addVehicle(direction);
        arrivalClocks[direction] += arrivalIntervals[direction];
      }
    }
  }

  function advanceVehicles(deltaSeconds) {
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      const queue = vehiclesByDirection[direction].sort((first, second) => first.position - second.position);
      let precedingVehicle = null;

      for (const vehicle of queue) {
        const mayContinueThrough = vehicle.position < 0
          || (signalStates[direction] === SIGNAL.GREEN
            && (precedingVehicle === null || precedingVehicle.position <= -52));
        const targetPosition = mayContinueThrough
          ? null
          : Math.max(STOP_LINE_DISTANCE, precedingVehicle ? precedingVehicle.position + VEHICLE_GAP : STOP_LINE_DISTANCE);
        const remainingDistance = targetPosition === null ? Infinity : Math.max(0, vehicle.position - targetPosition);
        const brakingSpeed = Math.sqrt(2 * 120 * remainingDistance);
        const targetSpeed = Math.min(47, brakingSpeed);
        const acceleration = targetSpeed > vehicle.speed ? (mayContinueThrough ? 100 : 150) : 120;
        vehicle.speed += Math.sign(targetSpeed - vehicle.speed) * Math.min(Math.abs(targetSpeed - vehicle.speed), acceleration * deltaSeconds);
        vehicle.speed = Math.max(0, vehicle.speed);

        let nextPosition = vehicle.position - vehicle.speed * deltaSeconds;
        if (targetPosition !== null && nextPosition < targetPosition) {
          nextPosition = targetPosition;
          vehicle.speed = 0;
        }
        vehicle.position = nextPosition;

        if (vehicle.speed === 0 && vehicle.position >= 0) vehicle.waitSeconds += deltaSeconds;
        precedingVehicle = vehicle;
      }

      for (let index = queue.length - 1; index >= 0; index -= 1) {
        if (queue[index].position < -245) {
          const [completedVehicle] = queue.splice(index, 1);
          vehiclesById.delete(completedVehicle.id);
          vehiclesPassed[direction] += 1;
          completedWaitSeconds += completedVehicle.waitSeconds;
        }
      }
    }
  }

  function updateStatus() {
    elements.statusWrap.classList.toggle("is-running", running);
    elements.statusWrap.classList.toggle("is-paused", !running && elapsedSeconds > 0);
    elements.status.textContent = running ? "RUNNING" : elapsedSeconds > 0 ? "PAUSED" : "READY";
    elements.controlState.textContent = running ? "RUNNING" : elapsedSeconds > 0 ? "PAUSED" : "STOPPED";
    elements.start.disabled = running || elapsedSeconds > 0;
    elements.pause.disabled = !running;
    elements.resume.disabled = running || elapsedSeconds === 0;
  }

  function renderSignals() {
    elements.signalUnits.forEach((unit) => {
      const direction = Number(unit.dataset.signal);
      const state = signalStates[direction].toLowerCase();
      unit.querySelectorAll(".lamp").forEach((lamp) => {
        lamp.classList.toggle("is-lit", lamp.classList.contains(`lamp-${state}`));
      });
    });
    const phase = PHASES[phaseIndex];
    elements.activeMovement.textContent = phase.state === SIGNAL.RED ? "CLEARANCE" : phase.movement;
    elements.phaseRemaining.textContent = Math.max(0, Math.ceil(phase.duration - phaseElapsed)).toString().padStart(2, "0");
  }

  function renderDirections() {
    const header = `<div class="direction-header"><span>APPROACH</span><span>SIGNAL</span><span>WAIT / OUT</span><span>DENSITY</span></div>`;
    const rows = DIRECTIONS.map((direction, index) => {
      const queueLength = vehiclesByDirection[index].filter((vehicle) => vehicle.position >= 0).length;
      const bars = Array.from({ length: DENSITY_LIMITS.queue }, (_, bar) =>
        `<i class="${bar < queueLength ? "filled" : ""}"></i>`).join("");
      const signalClass = signalStates[index] === SIGNAL.GREEN ? "is-green" : signalStates[index] === SIGNAL.AMBER ? "is-amber" : "";
      return `<div class="direction-row">
        <span class="direction-name"><span class="direction-compass">${direction[0]}</span>${direction}</span>
        <span class="signal-state ${signalClass}">${signalStates[index]}</span>
        <span class="queue-cell">${waitingVehicles[index]} <span aria-hidden="true">/</span> <span class="passed-cell">${vehiclesPassed[index]}</span></span>
        <span class="density-cell"><span class="queue-bars ${trafficDensity[index] === "HIGH" ? "is-high" : ""}">${bars}</span>${trafficDensity[index]}</span>
      </div>`;
    }).join("");
    elements.directionTable.innerHTML = header + rows;
  }

  function renderArrays() {
    const arrays = [
      { name: "signalStates", values: signalStates, classFor: (value) => value === SIGNAL.GREEN ? "active" : value === SIGNAL.AMBER ? "amber" : "" },
      { name: "waitingVehicles", values: waitingVehicles },
      { name: "vehiclesPassed", values: vehiclesPassed },
      { name: "trafficDensity", values: trafficDensity, classFor: (value) => value === "HIGH" ? "amber" : "" },
      { name: "queueLengths", values: vehiclesByDirection.map((queue) => queue.filter((vehicle) => vehicle.position >= 0).length) }
    ];
    elements.arrayList.innerHTML = arrays.map(({ name, values, classFor = () => "" }) => `
      <div class="array-row">
        <span class="array-name">${name}</span>
        <span class="array-values">${values.map((value, index) => `<span class="array-value ${classFor(value)}"><b>${String(index).padStart(2, "0")}</b>${value}</span>`).join("")}</span>
      </div>`).join("");
  }

  function renderVehicles() {
    const markup = [...vehiclesById.values()].map((vehicle) => {
      const approach = APPROACH_LAYOUT[vehicle.direction];
      const x = typeof approach.x === "function" ? approach.x(vehicle.position) : approach.x;
      const y = typeof approach.y === "function" ? approach.y(vehicle.position) : approach.y;
      return `<g class="vehicle" transform="translate(${x} ${y}) rotate(${approach.rotation})" style="--vehicle-color:${vehicle.color}">
        <use href="#vehicle-shape"/>
      </g>`;
    }).join("");
    elements.vehicleLayer.innerHTML = markup;
  }

  function render() {
    updateQueuesAndDensity();
    const waitingTotal = waitingVehicles.reduce((sum, count) => sum + count, 0);
    const passedTotal = vehiclesPassed.reduce((sum, count) => sum + count, 0);
    elements.totalWaiting.textContent = String(waitingTotal);
    elements.totalPassed.textContent = String(passedTotal);
    elements.averageWait.innerHTML = passedTotal === 0
      ? `—<small> SEC</small>`
      : `${(completedWaitSeconds / passedTotal).toFixed(1)}<small> SEC</small>`;
    elements.clock.textContent = formatClock(elapsedSeconds);
    renderSignals();
    renderDirections();
    renderArrays();
    renderVehicles();
    updateStatus();
  }

  function tick(timestamp) {
    if (!running) return;
    if (lastFrame === 0) lastFrame = timestamp;
    const realDelta = Math.min((timestamp - lastFrame) / 1000, 0.1);
    lastFrame = timestamp;
    const deltaSeconds = realDelta * Number(elements.speed.value);
    elapsedSeconds += deltaSeconds;
    advanceSignalCycle(deltaSeconds);
    advanceArrivals(deltaSeconds);
    advanceVehicles(deltaSeconds);
    renderAccumulator += realDelta;
    if (renderAccumulator >= 0.08) {
      renderAccumulator = 0;
      render();
    }
    animationFrame = requestAnimationFrame(tick);
  }

  function start() {
    if (running || elapsedSeconds > 0) return;
    running = true;
    lastFrame = 0;
    animationFrame = requestAnimationFrame(tick);
    render();
  }

  function pause() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(animationFrame);
    lastFrame = 0;
    render();
  }

  function resume() {
    if (running || elapsedSeconds === 0) return;
    running = true;
    lastFrame = 0;
    animationFrame = requestAnimationFrame(tick);
    render();
  }

  function reset() {
    running = false;
    cancelAnimationFrame(animationFrame);
    elapsedSeconds = 0;
    phaseIndex = 2;
    phaseElapsed = 0;
    nextVehicleId = 1;
    completedWaitSeconds = 0;
    lastFrame = 0;
    vehiclesById.clear();
    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      vehiclesByDirection[direction].length = 0;
      vehiclesPassed[direction] = 0;
      arrivalClocks[direction] = [1.2, 3.4, 5.6, 2.8][direction];
    }
    applyPhase();
    elements.addHint.textContent = "Queue limit: 4 per approach";
    render();
  }

  elements.start.addEventListener("click", start);
  elements.pause.addEventListener("click", pause);
  elements.resume.addEventListener("click", resume);
  elements.reset.addEventListener("click", reset);
  elements.addVehicle.addEventListener("click", () => addVehicle(Number(elements.directionSelect.value)));
  elements.speed.addEventListener("change", render);

  applyPhase();
  render();
})();
