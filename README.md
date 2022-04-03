# deno-systray

SysTray module for Deno using the [go systray library](https://github.com/getlantern/systray).

## Usage

```ts
import SysTray from "https://deno.land/x/systray@v0.1.0/mod.ts";

const systray = new SysTray({
  menu: {
    // Use .png icon in macOS/Linux and .ico format in windows
    icon: "<base64 image string>",
    title: "Hello",
    tooltip: "Tips",
    items: [
      {
        title: "aa",
        tooltip: "bb",
        // checked is implemented by plain text in linux
        checked: true,
        enabled: true,
      },
      {
        title: "aa2",
        tooltip: "bb",
        checked: false,
        enabled: true,
      },
      {
        title: "Exit",
        tooltip: "bb",
        checked: false,
        enabled: true,
      },
    ],
  },
  debug: false,
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
```

## Credits

- https://github.com/getlantern/systray
- https://github.com/zaaack/systray-portable

## License

MIT
