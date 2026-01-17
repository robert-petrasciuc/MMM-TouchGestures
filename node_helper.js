const NodeHelper = require("node_helper");
const { spawn } = require("child_process");

module.exports = NodeHelper.create({

  start() {
    console.log("MMM-TouchGestures helper started");

    // Stable device path
    this.DEVICE = "/dev/input/by-id/usb-eGalax_Inc._USB_TouchController-event-if00";

    // State tracking
    this.rawX = 0;
    this.rawY = 0;
    this.touching = false;
    this.swipeBuffer = [];

    this.SWIPE_THRESHOLD = 100; // pixels
    this.MAX_SWIPE_TIME = 500; // ms

    this.startEvtest();
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
    this.swipeBuffer.push([{ x, y, time: Date.now() }]);
    console.log(this.swipeBuffer);
    this.sendSocketNotification("TOUCH_DOWN", { x, y });
  },

  touchEnd(x, y) {
    if (!this.touching) return;
    this.touching = false;
    this.swipeBuffer.push([{ x, y, time: Date.now() }]);
    console.log(this.swipeBuffer);
    this.sendSocketNotification("TOUCH_UP", { x, y });

    console.log("line 0:", this.swipeBuffer[0])
    console.log("line 1:", this.swipeBuffer[1])
    console.log("line 2:", this.swipeBuffer[2])

    // Detect swipe
    const first = this.swipeBuffer[0];
    const last = this.swipeBuffer[this.swipeBuffer.length - 1];
    const dt = last.time - first.time;
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    console.log("first: ", this.first);
    console.log("last: ", this.last);
    console.log("time: ", this.dt,"deltax: ", this.dx,"deltay: ", this.dy);

    if (dt < this.MAX_SWIPE_TIME) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > this.SWIPE_THRESHOLD) {
        this.sendSocketNotification(dx > 0 ? "SWIPE_RIGHT" : "SWIPE_LEFT", {});
      } else if (Math.abs(dy) > this.SWIPE_THRESHOLD) {
        this.sendSocketNotification(dy > 0 ? "SWIPE_DOWN" : "SWIPE_UP", {});
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
