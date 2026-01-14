const NodeHelper = require("node_helper");
const evdev = require("evdev");

module.exports = NodeHelper.create({
  start() {
    this.device = null;
    this.touching = false;
    this.rawX = 0;
    this.rawY = 0;
    this.touchStart = null;

    // Swipe tuning
    this.SWIPE_MIN_DISTANCE = 80;
    this.SWIPE_MAX_TIME = 600;
  },

  socketNotificationReceived(notification) {
    if (notification === "START_TOUCH") {
      this.startTouch();
    }
  },

  startTouch() {
    // Touchscreen event device
    this.device = new evdev.Device("/dev/input/event5");

    this.device.on("EV_ABS", ev => {
      if (ev.code === "ABS_X") this.rawX = ev.value;
      if (ev.code === "ABS_Y") this.rawY = ev.value;
    });

    this.device.on("EV_KEY", ev => {
      if (ev.code === "BTN_TOUCH") {
        this.touching = ev.value === 1;

        if (this.touching) {
          this.onTouchStart();
        } else {
          this.onTouchEnd();
        }
      }
    });
  },

  calibrate(x, y) {
    // Your matrix:
    // x' = 1.57*y - 0.30
    // y' = 1.80*x - 0.42
    return {
      x: 1.57 * y - 0.30,
      y: 1.80 * x - 0.42
    };
  },

  onTouchStart() {
    const p = this.calibrate(this.rawX, this.rawY);

    this.touchStart = {
      x: p.x,
      y: p.y,
      time: Date.now()
    };
  },

  onTouchEnd() {
    if (!this.touchStart) return;

    const p = this.calibrate(this.rawX, this.rawY);
    const dx = p.x - this.touchStart.x;
    const dy = p.y - this.touchStart.y;
    const dt = Date.now() - this.touchStart.time;

    this.touchStart = null;

    if (dt > this.SWIPE_MAX_TIME) return;
    if (Math.abs(dx) < this.SWIPE_MIN_DISTANCE) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    if (dx > 0) {
      this.sendSocketNotification("SWIPE_RIGHT");
    } else {
      this.sendSocketNotification("SWIPE_LEFT");
    }
  }
});
