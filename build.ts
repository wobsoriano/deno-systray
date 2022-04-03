console.log("Building executable files...");
await Promise.all([
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_darwin",
      "-ldflags",
      "-s -w",
      "tray.go",
    ],
  }).status(),
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_linux",
      "-ldflags",
      "-s -w",
      "tray.go",
    ],
  }).status(),
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_windows.exe",
      "-ldflags",
      `"-s -w -H=windowsgui"`,
      "tray.go",
    ],
  }).status(),
]);
console.log("Done.");
