# 🎨 Color Store — VS Code Extension

## 📚 Table of Contents

- [Why Use Color Store?](#why-use-color-store)
- [Features](#features)
- [Getting Started](#getting-started)
- [Extension Settings](#extension-settings)
- [Feedback & Contributions](#feedback--contributions)
- [License](#license)
- [Credits](#credits)

**Color Store** is your all-in-one color management tool for VS Code. Effortlessly save, preview, organize, and copy color palettes—perfect for frontend developers, designers, and anyone working with color.

![Save Your Colors](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/save-colors.gif)

---

## Why Use Color Store?

- **Boost Your Productivity:** Instantly save, organize, and access your favorite colors without digging through your files or leaving VS Code.
- **Project-Based Palettes:** Keep your color schemes organized by project—no more cluttered lists!
- **Copy in Any Format:** Copy colors as plain text, CSS, or Tailwind classes with a single click.
- **Live Color Preview:** Instantly preview any color and its beautiful shades in a dedicated editor tab.
- **Modern, Responsive UI:** Enjoy a clean, theme-aware sidebar and modal dialogs that blend seamlessly with your VS Code setup.

---

## Features

- **Save & Organize Colors:** Store your favorite color codes (hex, rgb, hsl, named CSS colors, etc.) for quick access.
- **Name Your Colors:** Give any color a human-friendly name — in your saved colors and in each project. Add a name when saving, or rename later with the ✎ button.
- **Project Palettes Stored in Your Repo:** Projects are saved as human-readable JSON in a `.colorstore/` folder at your workspace root (one file per project, e.g. `.colorstore/brand.json`), so you can **commit and share** them with your team. Personal colors live in `.colorstore/saved-colors.json`.
- **Auto-Sync:** The sidebar refreshes automatically when the `.colorstore/` files change on disk (for example after a `git pull`).
- **Scan Any File for Colors:** Color literals (hex, `rgb()/rgba()`, `hsl()/hsla()`, and CSS color names in CSS files) are recognized in your files. VS Code shows its native color swatch + picker, and a discreet inline label shows the palette name when a literal matches a **named** color of your current project.
- **Quick Actions on Hover:** Hover a color literal to *Add it to the current project*, *Replace it with a project color*, *Name / rename it*, or *Copy* it (plain / Tailwind / CSS).
- **Copy Color Codes Instantly:** Copy colors in multiple formats:
  - Plain text (e.g., `#1A1A1A`, `rgb(0, 0, 0)`)
  - Tailwind CSS (`bg-[#1A1A1A]`, `text-[#1A1A1A]`, `text-[rgb(0,0,0)]`)
  - CSS (`background-color: #1A1A1A;`, etc.)
- **Remove Colors Easily:** Clean up your palettes with a single click.
- **Color Preview:** Click "Preview" to see your color in multiple beautiful shades—great for theme design and inspiration.
- **Modern UI:** Clean, responsive sidebar and modal dialogs, with full support for VS Code themes.

---

## Getting Started

### 1. Install

- **From Marketplace:**  
  [Install Color Store from the Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=binyam.color-store) (search for `Color Store`).

- **From VSIX File:**  
  [Download color-store-0.0.3.vsix](https://github.com/binzam/vs-colorcode/releases/download/v0.0.3/color-store-0.0.3.vsix) and run:
  ```sh
  code --install-extension color-store-0.0.3.vsix
  ```

### 2. Usage

1. Open the sidebar and click the **Color Store** icon.
2. **Save Your Colors:** Enter a color code and click "Add Color".

   ![Save Your Colors](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/save-colors.gif)

3. **Use Saved Colors in Projects:**  
   Use saved colors as Tailwind **bg** or **text** classes.

   ![TailwindCSS bg](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/applying-tailwind-bg.gif)
   ![TailwindCSS text](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/applying-tailwind-text.gif)

4. **Create a Project:**  
   Click "+ New Project" to organize colors by project.

   ![Create a Project](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/project.gif)

5. **Preview Your Colors:**

![Preview Color](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/preview-colors.gif)

- **Remove Colors/Projects:**  
  Use the delete button (🗑️) to remove any color or project.
  ![Remove Color](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/remove.gif)

- **Theme Support:**  
  Works with all VS Code themes.
  ![Dark/Light Theme](https://raw.githubusercontent.com/binzam/vs-colorcode/main/media/gifs/different-themes.gif)

---

## Where Your Data Lives

Projects and personal colors are stored as JSON files in a `.colorstore/` folder at your workspace root:

```
.colorstore/
  brand.json          # one file per project  { version, kind, id, name, colors }
  saved-colors.json   # your personal saved colors
```

Commit these files to share palettes with your team. If you'd rather keep your personal colors out of git, add `.colorstore/saved-colors.json` to your `.gitignore`.

> On first launch with a folder open, any projects/colors from the previous versions (stored in VS Code global settings) are migrated automatically into `.colorstore/`. The old settings are kept as a backup.

## Extension Settings

| Setting | Default | Description |
| --- | --- | --- |
| `color-store.storeFolder` | `.colorstore` | Folder (relative to the workspace root) holding the palette files. |
| `color-store.scan.enabled` | `true` | Detect color literals in files (native swatch, palette-name annotation, hover actions). |
| `color-store.scan.languages` | `[]` (all files) | Optional allow-list of language ids to scan. Empty means every file; add ids (e.g. `css`, `typescript`) to restrict. |
| `color-store.scan.matchNamedCssColors` | `true` | Also recognize CSS color names (`red`, `gold`…), limited to CSS-family languages to avoid false positives. |

Commands: **Scan active editor for colors** and **Toggle color scanning** are available from the Command Palette.

---

## Feedback & Contributions

Love Color Store? Have ideas or found a bug?  
[Open an issue or contribute on GitHub](https://github.com/binzam/vs-colorcode).

---

[Homepage: https://vs-color-store.netlify.app](https://vs-color-store.netlify.app)

---

## License

[MIT](LICENSE)

---

## Credits

Built with ❤️ for the VS Code community.
