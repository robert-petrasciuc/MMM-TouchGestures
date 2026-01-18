Module.register("MMM-TouchGestures", {
  defaults: {
    swipeNotificationPrefix: "TOUCH_SWIPE"
  },

  start() {
    Log.info("MMM-TouchGestures started");
    this.sendSocketNotification("START_TOUCH");
  },

  socketNotificationReceived(notification, payload) {
     switch(notification) {
      case "TOUCH_DOWN":
        console.log("Touch down at", payload.x, payload.y);
        break;
      case "TOUCH_UP":
        console.log("Touch up at", payload.x, payload.y);
        break;
      case "TOUCH_MOVE":
        console.log("Touch move at", payload.x, payload.y);
        break;
      case "SWIPE_LEFT":
        console.log("Swipe LEFT detected");
        this.sendSwipeNotification("SWIPE_LEFT");
        break;
      case "SWIPE_RIGHT":
        console.log("Swipe RIGHT detected");
        this.sendSwipeNotification("SWIPE_RIGHT");
        break;
      case "SWIPE_UP":
        console.log("Swipe UP detected");
        break;
      case "SWIPE_DOWN":
        console.log("Swipe DOWN detected");
        break;
    }
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
