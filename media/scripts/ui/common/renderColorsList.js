export function renderColorsList(container, colors, type) {
  container.innerHTML = colors.length
    ? colors
        .map((color, index) => {
          const value = color.value;
          const name = color.name || '';
          const id = `copy-options-${type}-${index}`;
          const renameId = `rename-${type}-${index}`;
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
            <button class="rename-btn" title="Name / rename" data-rename-id="${renameId}">✎</button>
  <button class="preview-btn" title="Preview" data-color="${value}">👁️</button>
            <button class="remove-btn" data-color="${value}" data-type="${type}">🗑️</button>
          </div>
          <div id="${renameId}" class="rename-bar">
            <input class="rename-input" type="text" value="${escapeAttr(name)}" placeholder="Color name" data-color="${value}" data-type="${type}" />
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

  container.querySelectorAll('.rename-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bar = document.getElementById(btn.dataset.renameId);
      const isVisible = bar.style.display === 'flex';
      document
        .querySelectorAll('.rename-bar')
        .forEach((el) => (el.style.display = 'none'));
      bar.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        const field = bar.querySelector('.rename-input');
        field.focus();
        field.select();
      }
    });
  });

  container.querySelectorAll('.rename-input').forEach((field) => {
    const commit = () => {
      vscode.postMessage({
        command: 'renameColor',
        color: field.dataset.color,
        name: field.value.trim(),
        from: field.dataset.type,
      });
      field.closest('.rename-bar').style.display = 'none';
    };
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        commit();
      } else if (e.key === 'Escape') {
        field.closest('.rename-bar').style.display = 'none';
      }
    });
    field.addEventListener('click', (e) => e.stopPropagation());
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
