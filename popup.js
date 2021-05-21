let showPlayerButton,
  clearButton,
  extractorButton,
  timer,
  mainView,
  extractorView,
  goBackButton,
  copyBackportsButton,
  copyFeaturesButton,
  copyTitleButton,
  copyResearchesButton,
  copPostButton,
  copyAllButton,
  pasteAllButton,
  sprintNameSelect,
  sprintNameRow,
  noSprintFound,
  showDeprecatedActions,
  deprecatedActions,
  showGuide,
  longGuide,
  noActiveSprint,
  playerSection

function showPlayerButtonClicked() {
  runFunction(showPlayer)
}

function setCopiedState(button) {
  const originalText = button.textContent

  button.textContent = 'Copied!'
  button.disabled = true
  setTimeout(() => {
    button.textContent = originalText
    button.disabled = false
  }, 1500)
}

document.addEventListener('DOMContentLoaded', () => {
  showPlayerButton = document.getElementById('show-player')
  clearButton = document.getElementById('clear')
  extractorButton = document.getElementById('show-extractor')
  mainView = document.getElementById('main-view')
  extractorView = document.getElementById('extractor-view')
  goBackButton = document.getElementById('go-back')
  copyBackportsButton = document.getElementById('copy-backports')
  copyTitleButton = document.getElementById('copy-title')
  copyFeaturesButton = document.getElementById('copy-features')
  copyResearchesButton = document.getElementById('copy-researches')
  copyMetricHttpPostButton = document.getElementById('copy-metric-http-post')
  copyDashboardHttpPostButton = document.getElementById('copy-dashboard-http-post')
  copyAllButton = document.getElementById('copy-all')
  pasteAllButton = document.getElementById('paste-all')
  sprintNameSelect = document.getElementById('sprint-name')
  sprintNameRow = document.getElementById('sprint-name-row')
  noSprintFound = document.getElementById('no-sprint-found')
  showDeprecatedActions = document.getElementById('show-deprecated-actions')
  deprecatedActions = document.getElementById('deprecated-actions')
  showGuide = document.getElementById('show-guide')
  longGuide = document.getElementById('long-guide')
  noActiveSprint = document.getElementById('no-active-sprint')
  playerSection = document.getElementById('player-section')

  runFunction(isActiveSprintView, [], 0, (isActiveSprintView) => {
    if (!isActiveSprintView[0]) {
      noActiveSprint.style.display = 'flex'
      playerSection.classList.add('unavailable')
    }
  })

  runFunction(getSprintNames, [], 0, (result) => {
    if (!result[0].length) {
      extractorView.classList.add('unavailable')
    } else {
      result[0].forEach((name) => {
        const opt = document.createElement('option')
        opt.value = name
        opt.innerHTML = name
        sprintNameSelect.appendChild(opt)
      })
    }
  })

  // Main View
  showPlayerButton.addEventListener('click', () => {
    runFunction(showPlayer, [
      unselectPreviousSpeakers,
      skipCurrentSpeaker,
      selectNextSpeaker,
      selectPreviousSpeaker,
      postponeCurrentSpeaker,
      getSpeakerLabels,
      showHighlights,
      setFinalPlayerState
    ])
    window.close()
  })

  extractorButton.addEventListener('click', () => {
    mainView.style.display = 'none'
    extractorView.style.display = 'initial'
  })

  clearButton.addEventListener('click', () => {
    runFunction(unselectPreviousSpeakers)
    runFunction(clearData)
    window.close()
  })

  // Extractor
  goBackButton.addEventListener('click', () => {
    extractorView.style.display = 'none'
    mainView.style.display = 'initial'
  })

  showDeprecatedActions.addEventListener('click', () => {
    deprecatedActions.style.display = 'initial'
    showDeprecatedActions.style.display = 'none'
  })

  showGuide.addEventListener('click', () => {
    longGuide.style.display = 'flex'
    showGuide.style.display = 'none'
  })

  copyMetricHttpPostButton.addEventListener('click', () => {
    setCopiedState(copyMetricHttpPostButton)

    runFunction(
      copyMetricHttpPost,
      [getTasks, formatTask, getNumber],
      0,
      (text) => {
        console.log(text)
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  copyDashboardHttpPostButton.addEventListener('click', () => {
    setCopiedState(copyDashboardHttpPostButton)

    runFunction(
      copyDashboardHttpPost,
      [copyTitle, copyFeatures, copyBackports, copyResearches, getNumber, getTasks, formatTask],
      0,
      (text) => {
        console.log(text)
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  /* Deprecation starts */
  copyResearchesButton.addEventListener('click', () => {
    runFunction(
      copyResearches,
      [getTasks, formatTask],
      0,
      (text) => {
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  copyBackportsButton.addEventListener('click', () => {
    runFunction(
      copyBackports,
      [getTasks, formatTask, getNumber],
      0,
      (text) => {
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  copyTitleButton.addEventListener('click', () => {
    runFunction(
      copyTitle,
      [getTasks, formatTask],
      0,
      (text) => {
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  copyFeaturesButton.addEventListener('click', () => {
    runFunction(
      copyFeatures,
      [getTasks, formatTask],
      0,
      (text) => {
        navigator.clipboard.writeText(text)
      },
      sprintNameSelect.value,
      'sprintName'
    )
  })

  copyAllButton.addEventListener('click', () => {
    runFunction(
      copyAllDashboardData,
      [copyTitle, copyFeatures, copyBackports, copyResearches, getNumber, getTasks, formatTask],
      0,
      () => {},
      sprintNameSelect.value,
      'sprintName'
    )
  })

  pasteAllButton.addEventListener('click', () => {
    runFunction(pasteAllDashboardData, [], 0)
  })

  /* Deprecation ends */
})
