/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 * States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing)
 */

const STATES = {
  CLOSED: "CLOSED", // Normal operation
  OPEN: "OPEN", // Failing, reject all requests
  HALF_OPEN: "HALF_OPEN", // Testing if service recovered
};

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5; // Failures before opening
    this.successThreshold = options.successThreshold || 2; // Successes to close from half-open
    this.timeout = options.timeout || 60000; // Time before attempting half-open (60s)
    this.name = options.name || "default";

    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastError = null;
  }

  async execute(fn) {
    // Check if circuit is open
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        const error = new Error(
          `Circuit breaker is OPEN. Service temporarily unavailable. Retry in ${waitTime}s.`
        );
        error.circuitBreakerOpen = true;
        error.lastError = this.lastError;
        throw error;
      }
      // Timeout elapsed, try half-open
      this.state = STATES.HALF_OPEN;
      console.log(`🔄 Circuit Breaker [${this.name}]: OPEN -> HALF_OPEN`);
    }

    try {
      const result = await fn();

      // Success handling
      if (this.state === STATES.HALF_OPEN) {
        this.successCount++;
        if (this.successCount >= this.successThreshold) {
          this.close();
        }
      } else {
        this.close(); // Reset on success
      }

      return result;
    } catch (error) {
      this.lastError = error;
      this.failureCount++;

      console.warn(
        `⚠️ Circuit Breaker [${this.name}]: Failure ${this.failureCount}/${this.failureThreshold}`,
        error.message
      );

      // Open circuit if threshold reached
      if (
        this.state === STATES.HALF_OPEN ||
        this.failureCount >= this.failureThreshold
      ) {
        this.open();
      }

      throw error;
    }
  }

  open() {
    this.state = STATES.OPEN;
    this.nextAttempt = Date.now() + this.timeout;
    console.error(
      `🔴 Circuit Breaker [${this.name}]: OPEN (cooling down for ${this.timeout / 1000}s)`
    );
  }

  close() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastError = null;
    console.log(`🟢 Circuit Breaker [${this.name}]: CLOSED (normal operation)`);
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastError: this.lastError?.message,
    };
  }

  reset() {
    this.close();
    console.log(`🔄 Circuit Breaker [${this.name}]: Manual reset`);
  }
}

// Global circuit breakers for different services
const breakers = new Map();

export const getCircuitBreaker = (name, options = {}) => {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({ ...options, name }));
  }
  return breakers.get(name);
};

export const resetCircuitBreaker = (name) => {
  const breaker = breakers.get(name);
  if (breaker) {
    breaker.reset();
  }
};

export const getCircuitBreakerStates = () => {
  const states = {};
  breakers.forEach((breaker, name) => {
    states[name] = breaker.getState();
  });
  return states;
};

export default CircuitBreaker;
