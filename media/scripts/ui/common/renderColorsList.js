export function renderColorsList(container, colors, type) {
  container.innerHTML = colors.length
    ? colors
        .map((color, index) => {
          const value = color.value;
          const name = color.name || '';
          const id = `copy-options-${type}-${index}`;
          const editId = `edit-${type}-${index}`;
          const nameLabel = name
            ? `<span class="color-name">${escapeHtml(name)}</span>`
            : '';
          return /*html*/ `<div class="color-item" style="background:${value}">
          <div class="color-meta">
            ${nameLabel}
            <span class="color-code">${value}</span>
          </div>
          <div class="color-actions">
            <button class="copy-btn" title="Copy"  data-color="${value}" data-options-id="${id}">📋</button>
            <div id="${id}" class="copy-options">
              <button class="copy-option" data-format="plain">${value}</button>
              <button class="copy-option" data-format="tailwind-bg">bg-[${value}]</button>
              <button class="copy-option" data-format="tailwind-text">text-[${value}]</button>
              <button class="copy-option" data-format="css-color">color: ${value};</button>
              <button class="copy-option" data-format="css-bg">background-color: ${value};</button>
            </div>
            <button class="edit-btn" title="Edit name & color" data-edit-id="${editId}">✏️</button>
            <button class="preview-btn" title="Preview" data-color="${value}">🎨</button>
            <button class="remove-btn" title="Delete" data-color="${value}" data-type="${type}">🗑️</button>
          </div>
          <div id="${editId}" class="edit-bar" data-color="${value}" data-name="${escapeAttr(name)}" data-type="${type}">
            <input class="edit-input edit-name-input" type="text" value="${escapeAttr(name)}" placeholder="Color name" />
            <div class="edit-color-row">
              <input class="edit-color-picker" type="color" title="Pick a color" />
              <input class="edit-input edit-color-input" type="text" value="${escapeAttr(value)}" placeholder="Color (hex, rgb, hsl…)" title="Changing the color replaces every occurrence in the repo" />
              <button class="edit-apply-btn" title="Apply">✓</button>
            </div>
          </div>
        </div>`;
        })
        .join('')
    : /*html*/ `<p>No colors saved yet</p>`;

  setupColorActions(container);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

// Convert any CSS color to "#rrggbb" for <input type="color">, by letting the
// DOM parse it (rgb()/hsl()/names all resolve through computed style).
function toHexApprox(value) {
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const m = computed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) {
    return '#000000';
  }
  const hex = (n) => Number(m[n]).toString(16).padStart(2, '0');
  return `#${hex(1)}${hex(2)}${hex(3)}`;
}

function setupColorActions(container) {
  container.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = document.getElementById(btn.dataset.optionsId);
      const isVisible = menu.style.display === 'flex';
      document
        .querySelectorAll('.copy-options')
        .forEach((el) => (el.style.display = 'none'));
      menu.style.display = isVisible ? 'none' : 'flex';
    });
  });

  container.querySelectorAll('.copy-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      const color = btn.closest('.color-actions').querySelector('.copy-btn')
        .dataset.color;
      const text = formatColor(color, format);
      vscode.postMessage({ command: 'copy', text });
      btn.parentElement.style.display = 'none';
    });
  });

  container.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      vscode.postMessage({
        command: 'removeColor',
        color: btn.dataset.color,
        from: btn.dataset.type,
      });
    });
  });

  container.querySelectorAll('.preview-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      vscode.postMessage({ command: 'previewColor', color: btn.dataset.color });
    });
  });

  container.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bar = document.getElementById(btn.dataset.editId);
      const isVisible = bar.style.display === 'flex';
      document
        .querySelectorAll('.edit-bar')
        .forEach((el) => (el.style.display = 'none'));
      bar.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        const nameField = bar.querySelector('.edit-name-input');
        bar.querySelector('.edit-color-picker').value = toHexApprox(
          bar.dataset.color
        );
        nameField.focus();
        nameField.select();
      }
    });
  });

  container.querySelectorAll('.edit-bar').forEach((bar) => {
    const nameField = bar.querySelector('.edit-name-input');
    const colorField = bar.querySelector('.edit-color-input');
    const picker = bar.querySelector('.edit-color-picker');
    const applyBtn = bar.querySelector('.edit-apply-btn');

    // Keep the swatch and the text field in sync, both ways.
    picker.addEventListener('input', () => {
      colorField.value = picker.value;
    });
    colorField.addEventListener('input', () => {
      picker.value = toHexApprox(colorField.value);
    });

    // Apply only what actually changed: name → rename, color → repo-wide
    // replace (occurrence preview handled by the extension side).
    const commit = () => {
      const newName = nameField.value.trim();
      const newColor = colorField.value.trim();
      if (newName !== bar.dataset.name) {
        vscode.postMessage({
          command: 'renameColor',
          color: bar.dataset.color,
          name: newName,
          from: bar.dataset.type,
        });
      }
      if (newColor && newColor !== bar.dataset.color) {
        vscode.postMessage({
          command: 'replaceColorEverywhere',
          color: bar.dataset.color,
          newColor,
          from: bar.dataset.type,
        });
      }
      bar.style.display = 'none';
    };
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      commit();
    });
    [nameField, colorField].forEach((field) => {
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          commit();
        } else if (e.key === 'Escape') {
          bar.style.display = 'none';
        }
      });
      field.addEventListener('click', (e) => e.stopPropagation());
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.copy-options') && !e.target.closest('.copy-btn')) {
      document
        .querySelectorAll('.copy-options')
        .forEach((el) => (el.style.display = 'none'));
    }
  });
}

function formatColor(color, format) {
  switch (format) {
    case 'tailwind-bg':
      return `bg-[${color}]`;
    case 'tailwind-text':
      return `text-[${color}]`;
    case 'css-color':
      return `color: ${color};`;
    case 'css-bg':
      return `background-color: ${color};`;
    default:
      return color;
  }
}
