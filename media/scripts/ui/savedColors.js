import { renderColorsList } from './common/renderColorsList.js';

export function initSavedColors() {
  const input = document.getElementById('savedColorsInput');
  const nameInput = document.getElementById('savedColorsNameInput');
  const button = document.getElementById('addSavedColorBtn');

  button.addEventListener('click', () => {
    const color = input.value.trim();
    const name = nameInput.value.trim();
    if (color) {
      vscode.postMessage({ command: 'addColor', color, name, from: 'saved' });
      input.value = '';
      nameInput.value = '';
    }
  });

  const submitOnEnter = (e) => {
    if (e.key === 'Enter') {
      button.click();
    }
  };
  input.addEventListener('keypress', submitOnEnter);
  nameInput.addEventListener('keypress', submitOnEnter);

  document.addEventListener('stateUpdated', renderSavedColors);
}

export function renderSavedColors() {
  const container = document.getElementById('savedColorsList');
  renderColorsList(container, window.currentState.savedColors, 'saved');
}
