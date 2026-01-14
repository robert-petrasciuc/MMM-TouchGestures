Module.register("MMM-TouchGestures", {
  defaults: {
    swipeNotificationPrefix: "TOUCH_SWIPE"
  },

  start() {
    Log.info("MMM-TouchGestures started");
    this.sendSocketNotification("START_TOUCH");
  },

  socketNotificationReceived(notification, payload) {

    this.sendSwipeNotification(notification)
/*    if (notification === "SWIPE_LEFT") {
      this.sendNotification(
        this.config.swipeNotificationPrefix + "_LEFT"
      );
    }

    if (notification === "SWIPE_RIGHT") {
      this.sendNotification(
        this.config.swipeNotificationPrefix + "_RIGHT"
      );
    }
      */
  },

  sendSwipeNotification: function(direction) {
        var payload = {
            step: (direction === "SWIPE_RIGHT" ? 1 : -1)  // 1 to move forward, -1 to move backward
        };
        this.sendNotification("CX3_GET_CONFIG", {
          callback: (before) => {
            //Ensure 'before' contains a 'monthIndex'
            if(!before||typeof before.monthIndex !== "number") {
              console.error("KeyPress: Failed to retreive valid config.");
              return;
            }
            console.log(before.mode, before.monthIndex)
            this.sendNotification("CX3_SET_CONFIG", {
              monthIndex: before.monthIndex + payload.step,
           });
         }
       })
    }
});
