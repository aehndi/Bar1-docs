const canyonState = {
  activeSheet: 'teamA',
  sheetData: {
    teamA: {},
    teamB: {}
  },
  assignmentsBySheet: {
    teamA: {},
    teamB: {}
  },
  loaded: false
};

const canyonTimeline = [
  { label: 'Sofort', cest: '16:00', server: '12:00', minutes: 0 },
  { label: '+5 Min', cest: '16:05', server: '12:05', minutes: 5 },
  { label: '+8 Min', cest: '16:08', server: '12:08', minutes: 8 },
  { label: '+12 Min', cest: '16:12', server: '12:12', minutes: 12 }
];

const canyonBuildings = [
  { id: 'dataCenterLeft', label: 'Datenzentrum links', type: 'data-center', x: '8%', y: '12%', activation: 0 },
  { id: 'dataCenterRight', label: 'Datenzentrum rechts', type: 'data-center', x: '70%', y: '12%', activation: 0 },
  { id: 'defenceLeftTop', label: 'Verteidigung links oben', type: 'defence', x: '8%', y: '32%', activation: 5 },
  { id: 'defenceLeftBottom', label: 'Verteidigung links unten', type: 'defence', x: '8%', y: '52%', activation: 5 },
  { id: 'defenceRightTop', label: 'Verteidigung rechts oben', type: 'defence', x: '72%', y: '32%', activation: 8 },
  { id: 'serumLeft', label: 'Serum links', type: 'serum', x: '24%', y: '44%', activation: 5 },
  { id: 'serumRight', label: 'Serum rechts', type: 'serum', x: '62%', y: '44%', activation: 5 },
  { id: 'energyTower', label: 'Energieturm', type: 'energy', x: '43%', y: '25%', activation: 0 },
  { id: 'labHighSecurity', label: 'Hochsicherheitslabor', type: 'lab', x: '52%', y: '60%', activation: 8 },
  { id: 'sampleDepot1', label: 'Probenlager 1', type: 'depot', x: '18%', y: '72%', activation: 12 },
  { id: 'sampleDepot2', label: 'Probenlager 2', type: 'depot', x: '33%', y: '76%', activation: 12 },
  { id: 'sampleDepot3', label: 'Probenlager 3', type: 'depot', x: '58%', y: '72%', activation: 12 },
  { id: 'sampleDepot4', label: 'Probenlager 4', type: 'depot', x: '73%', y: '78%', activation: 12 }
];

function canyonInit() {
  initControls();
  restoreState();
  renderTimeline();
  renderBuildings();
  initGoogleSheets();
}

function initControls() {
  document.getElementById('sheetSelector').value = canyonState.activeSheet;
  document.getElementById('sheetSelector').addEventListener('change', (event) => {
    canyonState.activeSheet = event.target.value;
    saveState();
    renderBuildings();
    renderTimeline();
    showToast(`Team gewechselt: ${event.target.options[event.target.selectedIndex].text}`);
  });

  document.getElementById('resetButton').addEventListener('click', () => {
    canyonState.assignmentsBySheet[canyonState.activeSheet] = {};
    saveState();
    renderBuildings();
    showToast('Zuweisungen zurückgesetzt.');
  });

  document.getElementById('exportButton').addEventListener('click', exportAssignments);
  document.getElementById('importButton').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });

  document.getElementById('importFile').addEventListener('change', handleImportFile);
  window.addEventListener('resize', renderTimeline);
}

function initGoogleSheets() {
  const sheetStatus = document.getElementById('sheetStatus');

  if (!window.SHEETS_CONFIG || !SHEETS_CONFIG.spreadsheetId || !SHEETS_CONFIG.apiKey) {
    sheetStatus.textContent = 'Bitte trage spreadsheetId und apiKey in config.js ein.';
    return;
  }

  if (!window.gapi) {
    sheetStatus.textContent = 'Google API konnte nicht geladen werden.';
    return;
  }

  gapi.load('client', async () => {
    try {
      await gapi.client.init({ apiKey: SHEETS_CONFIG.apiKey });
      await gapi.client.load('https://sheets.googleapis.com/$discovery/rest?version=v4');
      await fetchSheetData();
      sheetStatus.textContent = 'Google Sheets geladen.';
    } catch (error) {
      sheetStatus.textContent = 'Fehler beim Laden der Google Sheets API.';
      console.error(error);
    }
  });
}

async function fetchSheetData() {
  const ranges = [
    `${SHEETS_CONFIG.sheets.teamA}!A:B`,
    `${SHEETS_CONFIG.sheets.teamB}!A:B`
  ];

  try {
    const response = await gapi.client.sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEETS_CONFIG.spreadsheetId,
      ranges
    });

    const valueRanges = response.result.valueRanges || [];
    canyonState.sheetData.teamA = parseSheetValues(valueRanges[0]?.values || []);
    canyonState.sheetData.teamB = parseSheetValues(valueRanges[1]?.values || []);
    canyonState.loaded = true;
    renderBuildings();
  } catch (error) {
    console.error('Fehler beim Abrufen der Sheets:', error);
    document.getElementById('sheetStatus').textContent = 'Fehler beim Abrufen der Sheet-Daten.';
  }
}

function parseSheetValues(rows) {
  const groups = {};

  for (let i = 1; i < rows.length; i += 1) {
    const teamLabel = rows[i][0] ? rows[i][0].toString().trim() : '';
    const playerName = rows[i][1] ? rows[i][1].toString().trim() : '';
    if (!teamLabel || !playerName) continue;

    const normalizedTeam = /substitute|ersatz|reserve/i.test(teamLabel) ? 'Substitutes' : teamLabel;
    groups[normalizedTeam] = groups[normalizedTeam] || [];
    if (!groups[normalizedTeam].includes(playerName)) {
      groups[normalizedTeam].push(playerName);
    }
  }

  const sortedGroups = {};
  Object.keys(groups)
    .sort((a, b) => {
      if (a === 'Substitutes') return 1;
      if (b === 'Substitutes') return -1;
      return a.localeCompare(b, 'de');
    })
    .forEach((label) => {
      sortedGroups[label] = groups[label];
    });

  return sortedGroups;
}

function getCurrentAssignments() {
  return canyonState.assignmentsBySheet[canyonState.activeSheet] || {};
}

function getAssignedPlayerBuilding(playerName) {
  const assignments = getCurrentAssignments();
  return Object.keys(assignments).find((buildingId) => assignments[buildingId] === playerName);
}

function renderBuildings() {
  const map = document.getElementById('mapContainer');
  const currentAssignments = getCurrentAssignments();
  const groupData = canyonState.sheetData[canyonState.activeSheet] || {};

  map.innerHTML = '';

  canyonBuildings.forEach((building) => {
    const card = document.createElement('div');
    card.className = `building-card ${building.type}`;
    card.style.left = building.x;
    card.style.top = building.y;
    card.dataset.time = getPhaseLabel(building.activation);

    const title = document.createElement('div');
    title.className = 'building-title';
    title.textContent = building.label;

    const assigned = document.createElement('div');
    assigned.className = 'building-assigned';
    const assignment = currentAssignments[building.id];
    assigned.innerHTML = assignment ? `<span draggable="true" class="draggable-player">${assignment}</span>` : '<span class="empty-text">Leer</span>';
    if (!assignment) {
      assigned.classList.add('empty');
    }

    if (assignment) {
      assigned.querySelector('.draggable-player').addEventListener('dragstart', handleDragStart);
      assigned.querySelector('.draggable-player').dataset.buildingId = building.id;
    }

    const select = document.createElement('select');
    select.dataset.buildingId = building.id;
    select.className = 'player-select';
    select.addEventListener('change', handlePlayerChange);

    buildPlayerSelectOptions(select, building.id, groupData);

    card.append(title, assigned, select);
    card.addEventListener('dragover', (event) => event.preventDefault());
    card.addEventListener('drop', handleDrop);

    const phaseStatus = getCurrentPhaseStatus(building.activation);
    card.classList.add(phaseStatus);

    map.appendChild(card);
  });

  renderAssignmentSummary();
}

function getPhaseLabel(minutes) {
  const phase = canyonTimeline.find((item) => item.minutes === minutes);
  return phase ? phase.label : '';
}

function getCurrentPhaseIndex() {
  const now = new Date();
  const start = new Date();
  start.setHours(16, 0, 0, 0);

  const delta = (now - start) / 60000;
  if (delta < 0) return 0;
  if (delta < 5) return 0;
  if (delta < 8) return 1;
  if (delta < 12) return 2;
  return 3;
}

function getCurrentPhaseStatus(activationMinutes) {
  const activeIndex = getCurrentPhaseIndex();
  const activeMinutes = canyonTimeline[activeIndex].minutes;

  if (activationMinutes === activeMinutes) {
    return 'active';
  }

  if (activationMinutes > activeMinutes) {
    return 'upcoming';
  }

  return 'done';
}

function renderTimeline() {
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  const activeIndex = getCurrentPhaseIndex();

  canyonTimeline.forEach((phase, index) => {
    const card = document.createElement('div');
    card.className = 'phase-card';
    if (index === activeIndex) {
      card.classList.add('active');
    } else if (index === activeIndex + 1) {
      card.classList.add('next');
    }

    card.innerHTML = `
      <h3>${phase.label}</h3>
      <p>${phase.cest} · ${phase.server}</p>
    `;
    timeline.appendChild(card);
  });
}

function buildPlayerSelectOptions(select, buildingId, groupData) {
  select.innerHTML = '';
  const noneOption = document.createElement('option');
  noneOption.value = '';
  noneOption.textContent = 'Kein Spieler';
  select.appendChild(noneOption);

  const currentAssignments = getCurrentAssignments();
  const currentAssignment = currentAssignments[buildingId];

  Object.entries(groupData).forEach(([groupLabel, players]) => {
    const optGroup = document.createElement('optgroup');
    optGroup.label = groupLabel;

    players.forEach((playerName) => {
      const option = document.createElement('option');
      option.value = playerName;
      option.textContent = playerName;
      const assignedBuilding = getAssignedPlayerBuilding(playerName);
      if (assignedBuilding && assignedBuilding !== buildingId) {
        option.disabled = true;
        option.textContent = `${playerName} (bereits vergeben)`;
      }

      if (currentAssignment === playerName) {
        option.selected = true;
      }

      optGroup.appendChild(option);
    });

    select.appendChild(optGroup);
  });
}

function handlePlayerChange(event) {
  const buildingId = event.target.dataset.buildingId;
  const selectedPlayer = event.target.value;
  setAssignment(buildingId, selectedPlayer);
}

function setAssignment(buildingId, playerName) {
  const assignments = getCurrentAssignments();
  const previousPlayer = assignments[buildingId];
  if (previousPlayer && previousPlayer === playerName) {
    return;
  }

  if (playerName) {
    const existingBuilding = getAssignedPlayerBuilding(playerName);
    if (existingBuilding) {
      delete assignments[existingBuilding];
    }
    assignments[buildingId] = playerName;
  } else {
    delete assignments[buildingId];
  }

  canyonState.assignmentsBySheet[canyonState.activeSheet] = assignments;
  saveState();
  renderBuildings();
}

function handleDragStart(event) {
  const buildingId = event.target.dataset.buildingId;
  event.dataTransfer.setData('text/plain', buildingId);
}

function handleDrop(event) {
  event.preventDefault();
  const sourceBuildingId = event.dataTransfer.getData('text/plain');
  const targetBuildingId = event.currentTarget.querySelector('.player-select')?.dataset.buildingId;

  if (!sourceBuildingId || !targetBuildingId || sourceBuildingId === targetBuildingId) {
    return;
  }

  const assignments = getCurrentAssignments();
  const playerName = assignments[sourceBuildingId];
  if (!playerName) {
    return;
  }

  delete assignments[sourceBuildingId];
  assignments[targetBuildingId] = playerName;
  canyonState.assignmentsBySheet[canyonState.activeSheet] = assignments;
  saveState();
  renderBuildings();
}

function renderAssignmentSummary() {
  const summary = document.getElementById('assignmentSummary');
  const currentAssignments = getCurrentAssignments();
  const entries = Object.entries(currentAssignments);
  summary.innerHTML = '';

  if (!entries.length) {
    summary.innerHTML = '<p>Keine Spieler zugewiesen. Wähle ein Team und beginne mit der Planung.</p>';
    return;
  }

  entries.forEach(([buildingId, playerName]) => {
    const building = canyonBuildings.find((item) => item.id === buildingId);
    const item = document.createElement('div');
    item.className = 'assignment-summary-item';
    item.innerHTML = `
      <strong>${building?.label || buildingId}</strong>
      <span>${playerName}</span>
    `;
    summary.appendChild(item);
  });
}

function saveState() {
  try {
    const payload = {
      activeSheet: canyonState.activeSheet,
      assignmentsBySheet: canyonState.assignmentsBySheet
    };
    localStorage.setItem('lastWarCanyonPlannerState', JSON.stringify(payload));
  } catch (error) {
    console.warn('Lokaler Speicher konnte nicht beschrieben werden.', error);
  }
}

function restoreState() {
  try {
    const stored = localStorage.getItem('lastWarCanyonPlannerState');
    if (!stored) {
      return;
    }

    const parsed = JSON.parse(stored);
    if (parsed.activeSheet) {
      canyonState.activeSheet = parsed.activeSheet;
    }

    if (parsed.assignmentsBySheet) {
      canyonState.assignmentsBySheet = {
        teamA: parsed.assignmentsBySheet.teamA || {},
        teamB: parsed.assignmentsBySheet.teamB || {}
      };
    }
  } catch (error) {
    console.warn('Fehler beim Lesen der gespeicherten Daten.', error);
  }
}

function exportAssignments() {
  const data = {
    sheet: canyonState.activeSheet,
    assignments: getCurrentAssignments(),
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `last-war-canyon-plan-${canyonState.activeSheet}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  showToast('Export erfolgreich.');
}

function handleImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.assignments || !imported.sheet) {
        throw new Error('Ungültige Import-Datei');
      }

      if (!['teamA', 'teamB'].includes(imported.sheet)) {
        throw new Error('Unbekanntes Sheet im Import.');
      }

      canyonState.activeSheet = imported.sheet;
      canyonState.assignmentsBySheet[canyonState.activeSheet] = imported.assignments;
      document.getElementById('sheetSelector').value = canyonState.activeSheet;
      saveState();
      renderBuildings();
      showToast('Import erfolgreich geladen.');
    } catch (error) {
      showToast(`Import fehlgeschlagen: ${error.message}`);
    }
  };

  reader.readAsText(file);
  event.target.value = '';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

window.addEventListener('DOMContentLoaded', canyonInit);
