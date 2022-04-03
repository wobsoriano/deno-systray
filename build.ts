console.log("Building executable files...");
await Promise.all([
  Deno.run({
    cmd: ["go", "build", "-o", "./traybin/tray_darwin", "tray.go"],
  }).status(),
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_darwin_release",
      "-ldflags",
      "-s -w",
      "tray.go",
    ],
  }).status(),
  Deno.run({
    cmd: ["go", "build", "-o", "./traybin/tray_linux", "tray.go"],
  }).status(),
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_linux_release",
      "-ldflags",
      "-s -w",
      "tray.go",
    ],
  }).status(),
  Deno.run({
    cmd: ["go", "build", "-o", "./traybin/tray_windows.exe", "tray.go"],
  }).status(),
  Deno.run({
    cmd: [
      "go",
      "build",
      "-o",
      "./traybin/tray_windows_release.exe",
      "-ldflags",
      "-s -w",
      "tray.go",
    ],
  }).status(),
]);
console.log("Done.");
