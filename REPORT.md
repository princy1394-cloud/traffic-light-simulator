# SIGNAL: An Array-Based Traffic Intersection Simulation

## Introduction

This report describes SIGNAL, a browser-based model of a four-way urban road junction. Its purpose is to demonstrate how arrays can organize information for several directions that share the same properties. The simulation connects those arrays to signal control, vehicle queues, movement, and displayed measurements.

## What is an array?

An array is an ordered collection of values stored under one variable name. Each value has an index, usually beginning at zero. A program can use an index to retrieve or update one item, or use a loop to apply the same operation to every item. An array is useful when a set of related values needs a consistent order. Arrays are not the only data structure used in software; objects, records, queues, maps, and databases may be more suitable for other relationships or operations.

## Real-world applications of arrays

1. **Traffic signal management:** A controller can store the current signal state for each approach in an ordered array. A loop can update and inspect the approaches using a shared direction index. Real controllers also use sensors, safety interlocks, and other data structures.
2. **Student examination results:** An application can keep scores for a class or a student's subjects in an array. The ordered values make totals, averages, and comparisons straightforward. Student records usually also need objects or database tables for names and course information.
3. **Inventory management:** A program can store stock counts for a fixed, ordered list of products in an array and apply a stock adjustment by product index. Larger inventory systems generally use product records and databases because products have many fields and may change over time.
4. **Weather observations:** A program can store a sequence of hourly temperature readings in an array, making it convenient to calculate a mean or inspect a time window. Production weather services combine arrays with timestamps, location metadata, and specialized storage.
5. **Hospital waiting lists:** A small scheduling component can hold a sequence of patients awaiting a service and examine them in order. Real hospital systems must also represent urgency, patient records, privacy, and changing priorities, so a queue and database are commonly involved.
6. **Banking transactions:** A transaction-processing component can store a batch of amounts or transaction records in an array to calculate totals or validate entries. Banking systems also rely on durable databases, audit logs, and transaction-processing safeguards.

These examples show that arrays are useful for ordered or indexed collections, while real applications usually combine them with other structures and services.

## Selected application and problem

SIGNAL models traffic arriving from the north, east, south, and west. At a real junction, conflicting movements must not receive permission to enter together. The program therefore coordinates opposing straight-through approaches in pairs and inserts amber and all-red clearance intervals between the two movement axes. The model provides a visual and inspectable example of queue and signal management.

## Array implementation

The direction index is consistent throughout the program:

```js
const DIRECTIONS = ["NORTH", "EAST", "SOUTH", "WEST"];
const signalStates = DIRECTIONS.map(() => SIGNAL.RED);
const vehiclesByDirection = DIRECTIONS.map(() => []);
const waitingVehicles = DIRECTIONS.map(() => 0);
const vehiclesPassed = DIRECTIONS.map(() => 0);
const trafficDensity = DIRECTIONS.map(() => "LOW");
```

| Array | Purpose |
| --- | --- |
| `DIRECTIONS` | Names each approach in the shared index order. |
| `signalStates` | Stores the live signal state (`RED`, `AMBER`, or `GREEN`) for each direction. |
| `vehiclesByDirection` | Stores the actual vehicle objects and positions for each approach. Each inner array is that approach's live queue and vehicles moving through it. |
| `waitingVehicles` | Stores the current count of vehicles stopped in each direction. |
| `vehiclesPassed` | Stores the number of vehicles that have completed the modeled crossing from each direction. |
| `trafficDensity` | Stores the density calculated from the number of vehicles currently on each approach. |
| `arrivalIntervals` and `arrivalClocks` | Store each direction's repeatable vehicle arrival interval and countdown. |

For example, index `1` refers to EAST in every direction-indexed array: `signalStates[1]` is the east signal, `vehiclesByDirection[1]` is the east approach's vehicle list, and `vehiclesPassed[1]` is the eastbound completed-vehicle count. Shared indices let loops update and display all four approaches without four copies of the same logic.

The inspector reads these program arrays directly. It also displays `queueLengths`, derived from the actual vehicle lists at render time. It does not use hardcoded example traffic values.

### Why this array algorithm suits the scenario

The number and order of approaches are fixed, and every approach has the same signal and traffic measurements. This makes parallel indexed arrays practical: one loop can apply a phase consistently to all four directions. The actual signal assignment is:

```js
for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
  signalStates[direction] = phase.green.includes(direction)
    ? phase.state
    : SIGNAL.RED;
}
```

The phase stores the indices that may proceed. For a north/south phase that list is `[0, 2]`; for an east/west phase it is `[1, 3]`. The loop assigns the active phase state only to those indices and makes the others red. This reduces duplicated direction-specific code and makes each approach's signal easy to compare with its queue and count.

Queues need a variable number of individual vehicles, so SIGNAL uses a nested array: `vehiclesByDirection[direction]` is an array of vehicle objects. Objects are appropriate for a vehicle because position, speed, and stopped time describe one entity together. The outer array still gives the four approaches a stable index. Each update filters the relevant queue to calculate the waiting count and density; when a vehicle clears the junction, the program increments `vehiclesPassed[direction]`. This combines arrays and objects rather than forcing every kind of information into a flat array.

The main trade-off is that parallel arrays rely on a consistent ordering. If a direction is inserted or reordered, every related array and phase index must follow the same change. In a larger system, named direction records or maps might reduce this synchronization risk. For this small fixed four-way example, the shared index order keeps the demonstration concise and makes the array relationship visible in the inspector.

## How the simulation works

The signal cycle has six timed stages: 19 seconds of north/south green, 4 seconds of north/south amber, 1.5 seconds of all-red clearance, 19 seconds of east/west green, 4 seconds of east/west amber, and 1.5 seconds of all-red clearance. During each stage, `signalStates` is updated for all four directions from the same phase definition. The crossing axes do not receive green at the same time.

Each direction has a fixed, staggered arrival interval. New vehicles are appended to that approach at a safe position behind existing traffic, up to a limit of four. Vehicles accelerate toward the stop line when the signal is green, stop at the line otherwise, and maintain a 43-unit following gap for their 38-unit SVG body. A following vehicle is not allowed into the junction until the preceding one has moved far enough through it. Once a vehicle clears the SVG intersection, it is removed from its approach, counted in `vehiclesPassed`, and its observed stopped time contributes to the mean wait measurement.

Waiting counts reflect vehicles stopped before the junction. Density uses the number of vehicles remaining on an approach: LOW is 0–1, MEDIUM is 2–3, and HIGH is 4. These documented thresholds are intended for this model rather than representing an official road-capacity standard.

Start, pause, resume, and reset control the simulation loop. While paused, no simulation time advances and no signals, arrivals, or vehicles update. The speed selector scales simulated elapsed time. Manual injection adds a vehicle to the chosen approach unless the queue limit has been reached. Reset clears the queues and completed counts and restores the original signal phase and arrival schedule.

## Using the simulator

1. Select **Start** to begin the clock, signal cycle, and staggered vehicle arrivals.
2. Observe the active movement and phase countdown. Compare the lights in the intersection with each approach's signal state.
3. Change the speed to alter simulated time, or choose an approach and select **Add vehicle** to inject traffic. The per-approach queue limit is four.
4. Select **Pause** to freeze all simulation updates and **Resume** to continue from that state. Select **Reset** to clear all vehicles and throughput counts and return the clock and cycle to their initial values.
5. Compare the approach measurements and Array inspector. The inspector's indices always map to 00 NORTH, 01 EAST, 02 SOUTH, and 03 WEST.

## Benefits and limitations

The shared indexing makes the relationship between each approach and its signal, queue, count, and density explicit. Loops reduce duplicated direction-specific logic, and the array inspector makes the live state visible for learning. The fixed arrival intervals also make the model predictable during demonstration.

The model is intentionally limited to straight-through vehicles and does not simulate turns, pedestrians, lane changes, adaptive signal timing, real sensor data, or calibrated traffic demand. Vehicles are represented as simple top-down SVG shapes. Consequently, this project illustrates programming concepts and basic phase safety; it should not be used to design or evaluate a real road junction.

## Conclusion

SIGNAL uses arrays as working parts of a small traffic simulation rather than as decorative examples. Shared direction indices connect signal states, vehicle queues, waiting counts, completed traffic, and calculated density. The simulation demonstrates how an array-based representation can make repeated updates and comparisons clearer while acknowledging that real transport systems need broader data models and safety engineering.
