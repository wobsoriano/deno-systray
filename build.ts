import { desc, run, task, sh } from "https://deno.land/x/drake@v1.5.1/mod.ts";

const commands = [
  "go build -o ./traybin/tray_darwin tray.go",
  'go build -o ./traybin/tray_darwin_release -ldflags "-s -w" tray.go',
  "go build -o ./traybin/tray_linux tray.go",
  'go build -o ./traybin/tray_linux_release -ldflags "-s -w" tray.go',
  "go build -o ./traybin/tray_windows.exe tray.go",
  'go build -o ./traybin/tray_windows_release.exe -ldflags "-s -w" tray.go',
];

desc("Build tray.go files to executable");
task("build", [], async () => {
  await sh(commands);
});

run("build");
