import { ipcMain, dialog, BrowserWindow, app } from "electron";
import { join } from "path";
import { writeFile, readFile } from "fs/promises";

export function registerFileHandlers() {
  ipcMain.handle(
    "file:save",
    async (
      event,
      content: string,
      defaultName: string,
      filters: Array<{ name: string; extensions: string[] }>,
    ): Promise<boolean> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return false;

      const result = await dialog.showSaveDialog(window, {
        defaultPath: join(app.getPath("downloads"), defaultName),
        filters,
      });

      if (result.canceled || !result.filePath) return false;

      await writeFile(result.filePath, content, "utf-8");
      return true;
    },
  );

  ipcMain.handle(
    "file:open",
    async (
      event,
      filters?: Array<{ name: string; extensions: string[] }>,
    ): Promise<{ filePath: string; content: string } | null> => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return null;

      const result = await dialog.showOpenDialog(window, {
        filters,
        properties: ["openFile"],
      });

      if (result.canceled || !result.filePaths.length) return null;

      const filePath = result.filePaths[0];
      const content = await readFile(filePath, "utf-8");

      return { filePath, content };
    },
  );
}
