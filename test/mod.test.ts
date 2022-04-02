import { assertEquals } from "https://deno.land/std@0.133.0/testing/asserts.ts";
import menu from "./menu.json" assert { type: "json" };
import SysTray from "../mod.ts";

Deno.test("systray debug is ok", async () => {
  const systray = new SysTray({ menu, debug: true });
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
    } else if (action.seq_id === 2) {
      systray.kill();
    }
    console.log("action", action);
  });
  await new Promise((resolve) => systray.onReady(() => resolve));
  const { code, signal } = await new Promise<{
    code: number | null;
    signal: string | null;
  }>((resolve) => systray.onExit((code, signal) => resolve({ code, signal })));
  console.log("code", code, "signal", signal);
  assertEquals(code, 0);
});

Deno.test("systray release is ok", async () => {
  const systray = new SysTray({ menu, debug: false });
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
    } else if (action.seq_id === 2) {
      systray.kill();
    }
    console.log("action", action);
  });
  await new Promise((resolve) => systray.onReady(() => resolve));
  const { code, signal } = await new Promise<{
    code: number | null;
    signal: string | null;
  }>((resolve) => systray.onExit((code, signal) => resolve({ code, signal })));
  console.log("code", code, "signal", signal);
  assertEquals(code, 0);
  assertEquals(signal, null);
});
