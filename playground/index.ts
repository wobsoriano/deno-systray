import SysTray from "../mod.ts";
import menu from "./menu.json" assert { type: "json" };

const systray = new SysTray({
  menu,
});

systray.onClick((action) => {
  if (action.seq_id === 0) {
    systray.sendAction({
      type: "update-item",
      item: {
        ...action.item,
        checked: !action.item.checked,
      },
      seq_id: action.seq_id,
    });
  } else if (action.seq_id === 1) {
    // open the url
    console.log("open the url", action);
  } else if (action.seq_id === 2) {
    systray.kill();
  }
});
