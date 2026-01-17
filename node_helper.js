const NodeHelper = require("node_helper");
const { spawn } = require("child_process");

module.exports = NodeHelper.create({

  start() {
    console.log("MMM-TouchGestures helper started");

    // Stable device path
    this.DEVICE = "/dev/input/by-id/usb-eGalax_Inc._USB_TouchController-event-if00";
    // Transformation matrix
    this.transform = {
          a: 0,
          b: 1.57,
          c: -0.30,
          d: 1.80,
          e: 0,
          f: -0.42
        };
    // Screen Resolution
    this.SCREEN_WIDTH = 1280;
    this.SCREEN_HEIGHT = 768;
    // State tracking
    this.rawX = 0;
    this.rawY = 0;
    this.touching = false;
    this.swipeBuffer = [];

    this.SWIPE_THRESHOLD = 100; // pixels
    this.MAX_SWIPE_TIME = 500; // ms

    this.startEvtest();
  },

  normalize(x, y) {
    return {
      x: x / 4095,
      y: y / 4095
    };
  },

  applyTransform(x, y) {
    const n = this.normalize(x, y);
    const { a, b, c, d, e, f } = this.transform;

    return {
      x: Math.round((a * n.x + b * n.y + c) * this.SCREEN_WIDTH),
      y: Math.round((d * n.x + e * n.y + f) * this.SCREEN_HEIGHT)
    };
  },


  startEvtest() {
    console.log("Starting evtest on", this.DEVICE);
    this.evtest = spawn("evtest", [this.DEVICE]);
    console.log("PID:", this.evtest.pid);

    this.evtest.stdout.on("data", data => this.handleData(data.toString()));
    this.evtest.stderr.on("data", data => console.error("evtest error:", data.toString()));
    this.evtest.on("close", code => console.log("evtest exited with", code));
  },

  handleData(data) {
    const lines = data.split("\n");
    lines.forEach(line => {
      if (!line.trim()) return;

      // Track X
      if (line.includes("ABS_X")) {
        const match = line.match(/value\s*(\d+)/);
        if (match) this.rawX = parseInt(match[1]);
        //console.log("rawX: ", this.rawX);
      }

      // Track Y
      if (line.includes("ABS_Y")) {
        const match = line.match(/value\s*(\d+)/);
        if (match) this.rawY = parseInt(match[1]);
        //console.log("rawY :", this.rawY);
      }

      // Track touch down/up
      if (line.includes("BTN_TOUCH")) {
        if (line.includes("value 1")) this.touchStart(this.rawX, this.rawY);
        if (line.includes("value 0")) this.touchEnd(this.rawX, this.rawY);
      }
    });
  },

  touchStart(x, y) {
    this.touching = true;

    const p = this.applyTransform(x, y);

    this.swipeBuffer.push({ x: p.x, y: p.y, time: Date.now() });
    this.sendSocketNotification("TOUCH_DOWN", p);
  },


  touchEnd(x, y) {
    if (!this.touching) return;
    this.touching = false;

    const p = this.applyTransform(x, y);

    this.swipeBuffer.push({ x: p.x, y: p.y, time: Date.now() });
    this.sendSocketNotification("TOUCH_UP", p);

    // Swipe detection stays the same
    const first = this.swipeBuffer[0];
    const last = this.swipeBuffer[this.swipeBuffer.length - 1];

    const dt = last.time - first.time;
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    console.log("time: ", dt,"deltax: ", dx,"deltay: ", dy);
    if (dt < this.MAX_SWIPE_TIME) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > this.SWIPE_THRESHOLD) {
        this.sendSocketNotification(dx > 0 ? "SWIPE_RIGHT" : "SWIPE_LEFT");
      } else if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
        this.sendSocketNotification(dy > 0 ? "SWIPE_DOWN" : "SWIPE_UP");
      }
    }

    this.swipeBuffer = [];
  },


  // Track movement while touching
  trackMove(x, y) {
    if (this.touching) {
      this.swipeBuffer.push({ x, y, time: Date.now() });
      this.sendSocketNotification("TOUCH_MOVE", { x, y });
    }
  }

});
