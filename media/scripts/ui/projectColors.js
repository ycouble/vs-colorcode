import { renderColorsList } from './common/renderColorsList.js';

export function initProjectColors() {
  const input = document.getElementById('projectColorInput');
  const nameInput = document.getElementById('projectColorNameInput');
  const button = document.getElementById('addProjectColorBtn');

  button.addEventListener('click', () => {
    const color = input.value.trim();
    const name = nameInput.value.trim();
    if (color) {
      vscode.postMessage({ command: 'addColor', color, name, from: 'project' });
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

  document.addEventListener('stateUpdated', renderProjectColors);
}
export function renderProjectColors() {
  if (!window.currentState.currentProject) {
    return;
  }

  document.getElementById(
    'projectColorsTitle'
  ).textContent = `${window.currentState.currentProject.name} Colors`;

  const container = document.getElementById('projectColorsList');
  renderColorsList(
    container,
    window.currentState.currentProject.colors,
    'project'
  );
}
