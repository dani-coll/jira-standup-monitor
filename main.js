function runFunction(fn, externalFunctions = [], timeout = undefined, callback = () => {}, arg = undefined, argName = undefined) {
  let code = ''
  if (arg) {
    code += 'var ' + argName + ' = "' + arg + '";'
  }
  externalFunctions.forEach((f) => {
    code += !!f ? f.toString() + ';' : ''
  })
  code += `${fn.toString()}; ${fn.name}(${argName});`

  if (timeout !== undefined) {
    setTimeout(() => {
      chrome.tabs.executeScript({ code }, callback)
    }, timeout)
  } else {
    chrome.tabs.executeScript({ code }, callback)
  }
}

function clearData() {
  chrome.storage.sync.set({ randomRange: [], index: 0 })
  window.location.reload()
}

function unselectPreviousSpeakers() {
  const filters = document.querySelectorAll('.js-quickfilter-button.ghx-active[title^="assignee = "]')

  filters.forEach((element) => element.click())
}

function getSpeakerLabels() {
  function removeRepeated(filterCollection) {
    const filterArray = [].slice.call(filterCollection)
    return filterArray.filter((speaker, i) => filterArray.findIndex((s) => s.title === speaker.title) === i)
  }

  return removeRepeated(document.querySelectorAll('.js-quickfilter-button[title^="assignee = "]'))
}

function setFinalPlayerState() {
  const mainButton = document.getElementById('jira-standup-main')
  mainButton.disabled = false
  mainButton.classList.remove('jira-standup-play')
  mainButton.classList.add('jira-standup-show-highlights')

  document.getElementById('jira-standup-next').disabled = true
  document.getElementById('jira-standup-skip').disabled = true
  document.getElementById('jira-standup-previous').disabled = true
  document.getElementById('jira-standup-postpone').disabled = true
}

function selectNextSpeaker() {
  function getRandomNumber(max) {
    return Math.floor(Math.random() * max)
  }

  chrome.storage.sync.get(['index', 'randomRange'], ({ index, randomRange }) => {
    const filters = getSpeakerLabels()
    if (!index) {
      randomRange = []
      while (randomRange.length < filters.length) {
        const position = getRandomNumber(filters.length)
        if (!randomRange.some((range) => range.position === position)) {
          randomRange.push({
            position,
            name: filters[position].textContent,
            id: filters[position].title.replace('assignee = ', ''),
            duration: 0
          })
        }
      }
      document.getElementById('jira-standup-previous').disabled = true
      document.getElementById('jira-standup-main').disabled = true
      document.getElementById('jira-standup-postpone').disabled = false
      document.getElementById('jira-standup-next').disabled = false
      document.getElementById('jira-standup-skip').disabled = false
      index = 0
      randomRange[index].startTime = Date.now()
      filters[randomRange[index].position].click()
      ++index
    } else if (index < randomRange.length) {
      randomRange[index - 1].duration += Date.now() - randomRange[index - 1].startTime
      randomRange[index].startTime = Date.now()
      filters[randomRange[index].position].click()
      ++index
      document.getElementById('jira-standup-previous').disabled = false
      document.getElementById('jira-standup-postpone').disabled = index >= randomRange.length
    } else {
      randomRange[randomRange.length - 1].duration += Date.now() - randomRange[index - 1].startTime
      chrome.storage.sync.set({ randomRange })

      setFinalPlayerState()
      return
    }

    setTimeout(() => {
      const selectedSpeaker = document.querySelectorAll(`.js-quickfilter-button[title^="assignee = ${randomRange[index - 1].id}"]`)
      if (selectedSpeaker && selectedSpeaker[0]) {
        chrome.storage.sync.set({ randomRange, index })
      }
    }, 300)
  })
}

function selectPreviousSpeaker() {
  chrome.storage.sync.get(['index', 'randomRange'], ({ index, randomRange }) => {
    const filters = getSpeakerLabels()
    if (index > 0) {
      --index

      if (index - 1 >= 0) {
        randomRange[index - 1].startTime = Date.now()
        filters[randomRange[index - 1].position].click()
      }

      document.getElementById('jira-standup-previous').disabled = index - 1 <= 0
      document.getElementById('jira-standup-postpone').disabled = false

      setTimeout(() => {
        const selectedSpeaker = document.querySelectorAll(`.js-quickfilter-button[title^="assignee = ${randomRange[index + 1].id}"]`)
        if (selectedSpeaker && selectedSpeaker[0]) {
          chrome.storage.sync.set({ index })
        }
      }, 300)
    }
  })
}

function postponeCurrentSpeaker() {
  chrome.storage.sync.get(['index', 'randomRange'], ({ index, randomRange }) => {
    const filters = getSpeakerLabels()
    const postponedUser = randomRange[index - 1]
    postponedUser.startTime = null
    postponedUser.duration = 0
    randomRange.splice(index - 1, 1)
    randomRange.push(postponedUser)

    randomRange[index - 1].startTime = Date.now()
    filters[randomRange[index - 1].position].click()

    chrome.storage.sync.set({ index, randomRange })
  })
}

function skipCurrentSpeaker() {
  chrome.storage.sync.get(['index', 'randomRange'], ({ index, randomRange }) => {
    const filters = getSpeakerLabels()
    if (randomRange[index]) {
      filters[randomRange[index].position].click()
      randomRange[index].startTime = Date.now()
    } else {
      setFinalPlayerState()
    }
    document.getElementById('jira-standup-postpone').disabled = index + 1 >= randomRange.length

    randomRange.splice(index - 1, 1)

    chrome.storage.sync.set({ index, randomRange })
  })
}

function showHighlights() {
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" type="text/css" href="' + chrome.runtime.getURL('confetti.css') + '">')
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" type="text/css" href="' + chrome.runtime.getURL('highlights.css') + '">')

  function getTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`
  }

  function createPanel(totalTime) {
    const panel = document.createElement('div')
    panel.className = 'jira-standup-panel'
    const panelContent = document.createElement('div')
    panelContent.className = 'jira-standup-panel-content'
    panel.appendChild(panelContent)

    const title = document.createElement('h1')
    title.textContent = `Total time is ${totalTime}`
    title.className = 'jira-standup-title'
    panelContent.appendChild(title)

    const innerPanel = document.createElement('div')
    innerPanel.className = 'jira-standup-inner-panel'
    panelContent.appendChild(innerPanel)
    document.body.appendChild(panel)
    return panelContent
  }

  chrome.storage.sync.get(['randomRange'], ({ randomRange }) => {
    if (!randomRange || !randomRange.length) {
      clearData()
    }
    const durationSeconds = Math.floor(
      (randomRange[randomRange.length - 1].startTime + randomRange[randomRange.length - 1].duration - randomRange[0].startTime) / 1000
    )
    const totalTime = getTime(durationSeconds)
    const panel = createPanel(totalTime)

    function createUserRow({ name, duration }) {
      const speakerRow = document.createElement('div')
      speakerRow.className = 'jira-standup-speaker-row'
      speakerRow.innerHTML = `<b>${name}</b><span style="text-align: right; flex: 1">${getTime(Math.floor(duration / 1000))}</span>`
      panel.childNodes[1].appendChild(speakerRow)
    }

    function createConfetti() {
      const confetti = document.createElement('div')
      confetti.className = 'jira-standup-confetti'

      for (let i = 0; i < 10; ++i) {
        const piece = document.createElement('div')
        piece.className = 'jira-standup-piece'
        confetti.appendChild(piece)
      }
      document.body.appendChild(confetti)
    }

    randomRange.sort((s1, s2) => s2.duration - s1.duration)
    randomRange.forEach((speaker) => {
      createUserRow(speaker)
    })

    createConfetti()
  })
}

function showPlayer() {
  document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" type="text/css" href="' + chrome.runtime.getURL('player.css') + '">')

  const PLAYER_ID = 'jira-standup-player'
  let player = document.getElementById(PLAYER_ID)
  if (player) {
    document.body.removeChild(player)
  }
  chrome.storage.sync.get(['randomRange', 'index'], ({ randomRange, index }) => {
    player = document.createElement('div')
    player.id = PLAYER_ID

    function addButton(id, clickCallback, disabled, title) {
      const button = document.createElement('button')
      button.classList.add('jira-standup-button')
      button.id = id
      button.title = title
      button.addEventListener('click', clickCallback)
      button.disabled = disabled
      return player.appendChild(button)
    }

    addButton(
      'jira-standup-postpone',
      () => {
        unselectPreviousSpeakers()
        postponeCurrentSpeaker()
      },
      !index || index + 1 >= randomRange.length,
      'Postpone'
    )

    addButton(
      'jira-standup-previous',
      () => {
        unselectPreviousSpeakers()
        selectPreviousSpeaker()
      },
      !index || randomRange.length <= index,
      'Previous'
    )

    const mainButton = addButton(
      'jira-standup-main',
      () => {
        chrome.storage.sync.get(['randomRange'], ({ randomRange }) => {
          if (randomRange.length && randomRange[randomRange.length - 1].duration) {
            showHighlights()
          } else {
            unselectPreviousSpeakers()
            selectNextSpeaker()
          }
        })
      },
      !(!index || (randomRange.length && randomRange[randomRange.length - 1].duration)),
      'Play / Results'
    )
    mainButton.classList.add('jira-standup-main-button')
    mainButton.classList.add(randomRange.length && randomRange[randomRange.length - 1].duration ? 'jira-standup-show-highlights' : 'jira-standup-play')

    addButton(
      'jira-standup-next',
      () => {
        unselectPreviousSpeakers()
        selectNextSpeaker()
      },
      !index || randomRange.length <= index,
      'Next'
    )

    addButton(
      'jira-standup-skip',
      () => {
        unselectPreviousSpeakers()
        skipCurrentSpeaker()
      },
      !index || randomRange.length <= index,
      'Skip'
    )

    document.body.appendChild(player)
  })
}

function isActiveSprintView() {
  return (
    window.location.origin === JIRA_BASE_URL &&
    window.location.pathname === '/secure/RapidBoard.jspa' &&
    !window.location.search.includes('view=planning')
  )
}

//** Extractor */

function getNumber(string) {
  return parseInt(string.replace(/^\D+/g, ''))
}

function getTasks(key, sprintName) {
  const sprint = Array.prototype.slice
    .call(document.getElementsByClassName('js-sprint-container'))
    .find((e) => e.querySelector(`span[data-fieldvalue="${sprintName}"]`))
  return Array.prototype.slice.call(sprint.querySelectorAll(`span[title="${key}"]`))
}

function formatTask(taskTypelement) {
  const id = taskTypelement.parentElement.querySelector('a[class*="js-key-link"]').title
  const title = taskTypelement.parentElement.querySelector('div[class*="ghx-summary"]').title

  return `- [[**${id}**]](JIRA_BASE_URL/browse/${id}) ${title}\n\n`
}

function copyTitle(sprintName) {
  const bugKey = 'Bug'
  const researchKey = 'Research'
  const rfaKey = 'Request for Assistance'
  const storyKey = 'Story'
  const taskKey = 'Task'

  const bugEmoji = ''
  const storyEmoji = ''
  const taskEmoji = ''
  const researchEmoji = ''
  const rfaEmoji = ''

  const bugs = getTasks(bugKey, sprintName)

  const stories = getTasks(storyKey, sprintName)

  const researches = getTasks(researchKey, sprintName)

  const tasks = getTasks(taskKey, sprintName)

  const rfas = getTasks(rfaKey, sprintName)

  let title = '## '

  if (bugs?.length) {
    title += bugEmoji + ' Bugs: ' + bugs.length
  }

  function addTasksToTitle(tasks, emoji, title) {
    if (tasks?.length) {
      return ' - ' + emoji + ' ' + title + ': ' + tasks.length
    }
    return ''
  }

  title += addTasksToTitle(rfas, rfaEmoji, 'RFA')
  title += addTasksToTitle(stories, storyEmoji, 'Stories')
  title += addTasksToTitle(researches, researchEmoji, 'Researches')
  title += addTasksToTitle(tasks, taskEmoji, 'Technical Tasks')

  return title
}

function copyMetricHttpPost(sprintName) {
  const bugKey = 'Bug'
  const researchKey = 'Research'
  const rfaKey = 'Request for Assistance'
  const storyKey = 'Story'

  const sprintNumber = getNumber(sprintName)
  const bugsArray = getTasks(bugKey, sprintName)
  const stories = getTasks(storyKey, sprintName).length
  const researches = getTasks(researchKey, sprintName).length
  const rfas = getTasks(rfaKey, sprintName).length
  const backports = bugsArray.filter((bug) => {
    const versionsElement = bug.parentElement.querySelector('span[class*="aui-label"]')
    if (versionsElement) {
      const sprints = versionsElement.title?.split(', ').map(getNumber)
      return sprints.filter((sprint) => sprint !== NaN).some((sprint) => sprintNumber - 2 >= sprint)
    }

    return false
  }).length

  let httpPostMetric = `curl --location --request POST 'TENANT_BASE_URL/api/v2/metrics/ingest?api-token='TENANT_TOKEN \
--header 'Content-Type: text/plain' \
--data-raw 'sprint.review,issues="stories",sprint="$sprint" $stories
sprint.review,issues="bugs",sprint="$sprint" $bugs
sprint.review,issues="rfa",sprint="$sprint" $rfas
sprint.review,issues="backport",sprint="$sprint" $backports
sprint.review,issues="research",sprint="$sprint" $researches'`

  httpPostMetric = httpPostMetric.replace(/\$sprint/g, sprintNumber)
  httpPostMetric = httpPostMetric.replace('$stories', stories)
  httpPostMetric = httpPostMetric.replace('$researches', researches)
  httpPostMetric = httpPostMetric.replace('$rfas', rfas)
  httpPostMetric = httpPostMetric.replace('$bugs', bugsArray.length)
  httpPostMetric = httpPostMetric.replace('$backports', backports)

  return httpPostMetric
}

function copyFeatures(sprintName) {
  const featureKey = 'Story'

  const features = getTasks(featureKey, sprintName)

  let featuresText = ''

  let epics = {}

  features.forEach((feature) => {
    let epicName = feature.parentElement.querySelector('span[data-epickey]')?.textContent

    if (!epicName) {
      epicName = 'Other'
    }

    if (epics[epicName]) {
      epics[epicName].push(feature)
    } else {
      epics[epicName] = [feature]
    }
  })

  Object.keys(epics).forEach((epic) => {
    featuresText += `## ${epic} \n \n`
    epics[epic].forEach((feature) => {
      featuresText += formatTask(feature)
    })
  })

  return featuresText
}

function copyBackports(sprintName) {
  const bugKey = 'Bug'

  const sprintNumber = getNumber(sprintName)
  const bugs = getTasks(bugKey, sprintName)

  let prodBackportsText = '## Backports to PROD\n\n'

  const prodBackports = bugs.filter((bug) => {
    const versionsElement = bug.parentElement.querySelector('span[class*="aui-label"]')
    if (versionsElement) {
      const sprints = versionsElement.title?.split(', ').map(getNumber)
      return sprints.filter((sprint) => sprint !== NaN).some((sprint) => sprintNumber - 2 >= sprint)
    }
    return false
  })

  if (!prodBackports.length) return ''

  prodBackports.forEach((backport) => {
    prodBackportsText += formatTask(backport)
  })
  return prodBackportsText
}

function copyResearches(sprintName) {
  const researchKey = 'Research'
  const researchEmoji = ''
  const researches = getTasks(researchKey, sprintName)

  if (!researches.length) return ''
  let researchesText = '## ' + researchEmoji + ' Research & investigation \n \n'

  researches.forEach((research) => {
    researchesText += formatTask(research)
  })
  return researchesText
}

function copyAllDashboardData(sprintName) {
  const title = copyTitle(sprintName)
  const features = copyFeatures(sprintName)
  const backports = copyBackports(sprintName)
  const researches = copyResearches(sprintName)
  chrome.storage.sync.set({ title, features, backports, researches })
}

function pasteAllDashboardData() {
  function addToMarkdown(text) {
    const doubleClick = new MouseEvent('dblclick', {
      view: window,
      bubbles: true,
      cancelable: true
    })

    document.querySelector('a[uitestid="gwt-debug-editButton"]')?.click()

    setTimeout(() => {
      document.querySelector('div[data-name="Markdown"]')?.dispatchEvent(doubleClick)
      const interval = setInterval(() => {
        const textarea = document.querySelector('textarea[uitestid="gwt-debug-markdown-tile-setup-markdown-editor"]')
        textarea.value = text
        textarea.click()
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
        textarea.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'e',
            keyCode: 69, // example values.
            code: 'KeyE', // put everything you need in this object.
            which: 69,
            shiftKey: false, // you don't need to include values
            ctrlKey: false, // if you aren't going to use them.
            metaKey: false // these are here for example's sake.
          })
        )
      }, 300)
      setTimeout(() => {
        clearInterval(interval)
        document.querySelector('a[uitestid="gwt-debug-sidepanelTileConfigCloseButton"]')?.click()
      }, 2000)
    }, 500)
  }

  chrome.storage.sync.get(['title', 'features', 'backports', 'researches'], ({ title, features, backports, researches }) => {
    addToMarkdown(title)
    setTimeout(() => addToMarkdown(features), 3000)
    setTimeout(() => addToMarkdown(backports), 6000)
    setTimeout(() => addToMarkdown(researches), 9000)
  })
}

function copyDashboardHttpPost(sprintName) {
  const backportsMarkdown = `
  {
    "name": "Markdown",
    "tileType": "MARKDOWN",
    "configured": true,
    "bounds": {
      "top": 380,
      "left": 38,
      "width": 380,
      "height": 190
    },
    "tileFilter": {},
    "markdown": "$backports"
  },`

  const researchesMarkdown = `
  {
    "name": "Markdown",
    "tileType": "MARKDOWN",
    "configured": true,
    "bounds": {
      "top": 76,
      "left": 912,
      "width": 380,
      "height": 152
    },
    "tileFilter": {},
    "markdown": "$researches"
  },`

  let httpPostDashboard = `
curl --location --request POST 'TENANT_BASE_URL/api/config/v1/dashboards?api-token='TENANT_TOKEN \
--header 'Content-Type: application/json' \
  -d '{
  "dashboardMetadata": {
    "name": "VIZARD Sprint Review $sprint",
    "shared": false,
    "owner": "$YOUR_EMAIL",
    "tags": [
      "vizard",
      "Data explorer",
      "sprint",
      "explorer",
      "$sprint"
    ],
    "dynamicFilters": {
      "filters": [
        "APPLICATION_TAG_KEY:vizardy",
        "APPLICATION_TAG_KEY:vizard",
        "PROCESS_GROUP_INSTANCE_TAG_KEY:vizard",
        "HOST_VIRTUALIZATION_TYPE",
        "OS_TYPE",
        "RELATED_CLOUD_APPLICATION",
        "HOST_MONITORING_MODE",
        "CUSTOM_DIMENSION:game",
        "SERVICE_TAG_KEY:vizardy",
        "APPLICATION_INJECTION_TYPE",
        "PROCESS_GROUP_TAG_KEY:vizard",
        "RELATED_NAMESPACE",
        "SERVICE_TAG_KEY:vizard",
        "DEPLOYMENT_TYPE",
        "PROCESS_GROUP_INSTANCE_TAG_KEY:vizardy",
        "HOST_TAG_KEY:vizardy",
        "KUBERNETES_CLUSTER",
        "PROCESS_GROUP_TAG_KEY:vizardy",
        "SERVICE_TYPE",
        "DATABASE_VENDOR",
        "HOST_TAG_KEY:vizard",
        "PAAS_VENDOR_TYPE"
      ]
    },
    "tilesNameSize": "medium"
  },
  "tiles": [
    {
      "name": "Markdown",
      "tileType": "MARKDOWN",
      "configured": true,
      "bounds": {
        "top": 342,
        "left": 38,
        "width": 380,
        "height": 38
      },
      "tileFilter": {
        "timeframe": "2022-01-14 14:00 to 2022-01-14 14:03"
      },
      "markdown": "With love from VIZARD  [sprint $sprint](JIRA_BASE_URL/secure/RapidBoard.jspa?rapidView=$projectId)"
    },
    {
      "name": "Markdown",
      "tileType": "MARKDOWN",
      "configured": true,
      "bounds": {
        "top": 0,
        "left": 912,
        "width": 494,
        "height": 76
      },
      "tileFilter": {},
      "markdown": "$title"
    },
    $backportsMarkdown
    $researchesMarkdown
    {
      "name": "Markdown",
      "tileType": "MARKDOWN",
      "configured": true,
      "bounds": {
        "top": 0,
        "left": 418,
        "width": 494,
        "height": 874
      },
      "tileFilter": {},
      "markdown": "$features"
    },
    {
      "name": "Markdown",
      "tileType": "MARKDOWN",
      "configured": true,
      "bounds": {
        "top": 228,
        "left": 912,
        "width": 380,
        "height": 76
      },
      "tileFilter": {},
      "markdown": "For [the next sprint](TENANT_BASE_URL/secure/RapidBoard.jspa?rapidView=$projectId&view=planning.nodetail&issueLimit=100) we have planned..."},
    {
      "name": "Pie",
      "tileType": "DATA_EXPLORER",
      "configured": true,
      "bounds": {
        "top": 0,
        "left": 38,
        "width": 380,
        "height": 342
      },
      "tileFilter": {},
      "customName": "Pie",
      "queries": [
        {
          "id": "A",
          "metric": "sprint.review",
          "spaceAggregation": "SUM",
          "timeAggregation": "DEFAULT",
          "splitBy": [
            "issues"
          ],
          "sortBy": "DESC",
          "filterBy": {
            "nestedFilters": [],
            "criteria": []
          },
          "limit": 100,
          "enabled": true
        }
      ],
      "visualConfig": {
        "type": "PIE_CHART",
        "global": {
          "hideLegend": false
        },
        "rules": [
          {
            "matcher": "A:",
            "properties": {
              "color": "DEFAULT"
            },
            "seriesOverrides": []
          }
        ],
        "axes": {
          "xAxis": {
            "visible": true
          },
          "yAxes": []
        },
        "heatmapSettings": {
          "yAxis": "VALUE"
        },
        "thresholds": [
          {
            "axisTarget": "LEFT",
            "rules": [
              {
                "color": "#7dc540"
              },
              {
                "color": "#f5d30f"
              },
              {
                "color": "#dc172a"
              }
            ],
            "queryId": "",
            "visible": true
          }
        ],
        "tableSettings": {
          "isThresholdBackgroundAppliedToCell": false
        },
        "graphChartSettings": {
          "connectNulls": false
        },
        "honeycombSettings": {
          "showHive": true,
          "showLegend": true,
          "showLabels": false
        }
      },
      "queriesSettings": {
        "resolution": ""
      }
    }
  ]
}'
`
  const sprintNumber = getNumber(sprintName)
  const title = copyTitle(sprintName)
  const features = copyFeatures(sprintName)
  const backports = copyBackports(sprintName)
  const researches = copyResearches(sprintName)

  httpPostDashboard = httpPostDashboard.replace('$title', title.replace(/\n/g, '\\n'))
  httpPostDashboard = httpPostDashboard.replace('$features', features.replace(/\n/g, '\\n'))

  if (researches !== '') {
    httpPostDashboard = httpPostDashboard.replace('$researchesMarkdown', researchesMarkdown)
    httpPostDashboard = httpPostDashboard.replace('$researches', researches.replace(/\n/g, '\\n'))
  } else {
    httpPostDashboard = httpPostDashboard.replace('$researchesMarkdown', '')
  }

  if (backports !== '') {
    httpPostDashboard = httpPostDashboard.replace('$backportsMarkdown', backportsMarkdown)
    httpPostDashboard = httpPostDashboard.replace('$backports', backports.replace(/\n/g, '\\n'))
  } else {
    httpPostDashboard = httpPostDashboard.replace('$backportsMarkdown', '')
  }

  httpPostDashboard = httpPostDashboard.replace(/\$sprint/g, sprintNumber)
  httpPostDashboard = httpPostDashboard.replace(/\$projectId/g, 2399)

  return httpPostDashboard
}

function getSprintNames() {
  return Array.prototype.slice.call(document.querySelectorAll('span[data-fieldname="sprintName"]')).map((element) => element.textContent)
}
