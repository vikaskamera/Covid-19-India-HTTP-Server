const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const dbPath = path.join(__dirname, 'covid19India.db')
let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server running at http://localhost:3000/')
    })
  } catch (error) {
    console.log('DB Error: ' + error.message)
    process.exit(1)
  }
}

initializeDBAndServer()

const convertStateDBObjectToResponseObject = stateObject => {
  return {
    stateId: stateObject.state_id,
    stateName: stateObject.state_name,
    population: stateObject.population,
  }
}

const convertDistrictDBObjectToResponseObject = districtObject => {
  return {
    districtId: districtObject.district_id,
    districtName: districtObject.district_name,
    stateId: districtObject.state_id,
    cases: districtObject.cases,
    cured: districtObject.cured,
    active: districtObject.active,
    deaths: districtObject.deaths,
  }
}

// Get states API

app.get('/states/', async (request, response) => {
  const getStatesQuery = `
        SELECT 
            *
        FROM 
            state
        ORDER BY
            state_id ASC;`

  const statesArray = await db.all(getStatesQuery)
  response.send(
    statesArray.map(eachObj => convertStateDBObjectToResponseObject(eachObj)),
  )
})

// Get state API

app.get('/states/:stateId', async (request, response) => {
  const {stateId} = request.params
  const getStateQuery = `
    SELECT 
      *
    FROM
      state
    WHERE 
      state_id=${stateId};
  `

  const state = await db.get(getStateQuery)
  response.send(convertStateDBObjectToResponseObject(state))
})

// Insert state API

app.post('/districts/', async (request, response) => {
  const district = request.body
  const {districtName, stateId, cases, cured, active, deaths} = district
  const insertStateQuery = `
    INSERT INTO
      district (district_name, state_id, cases, cured, active, deaths)
    VALUES (
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
    );
  `

  await db.run(insertStateQuery)
  response.send('District Successfully Added')
})

// Get district API

app.get('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const getDistrictQuery = `
    SELECT 
      *
    FROM
      district
    WHERE
      district_id=${districtId}
  `

  const district = await db.get(getDistrictQuery)
  response.send(convertDistrictDBObjectToResponseObject(district))
})

// Delete district API

app.delete('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const deleteDistrictQuery = `
    DELETE FROM
      district
    WHERE 
      district_id=${districtId};`

  await db.run(deleteDistrictQuery)
  response.send('District Removed')
})

// Update district API

app.put('/districts/:districtId', async (request, response) => {
  const {districtId} = request.params
  const district = request.body
  const {districtName, stateId, cases, cured, active, deaths} = district
  const updateDistrictQuery = `
    UPDATE
      district
    SET
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}
    WHERE
      district_id=${districtId};
      `
  await db.run(updateDistrictQuery)
  response.send('District Details Updated')
})

// Get state stats API

app.get('/states/:stateId/stats', async (request, response) => {
  const {stateId} = request.params
  const getStatesStatsQuery = `
    SELECT 
      SUM(cases),
      SUM(cured),
      SUM(active),
      SUM(deaths)
    FROM 
      district
    WHERE 
      state_id=${stateId};
  `

  const statsObject = await db.get(getStatesStatsQuery)
  response.send({
    totalCases: statsObject['SUM(cases)'],
    totalCured: statsObject['SUM(cured)'],
    totalActive: statsObject['SUM(active)'],
    totalDeaths: statsObject['SUM(deaths)'],
  })
})

// Get state by districtId API

app.get('/districts/:districtId/details', async (request, response) => {
  const {districtId} = request.params
  const getStateByDistrictQuery = `
    SELECT
      state_name
    FROM
      state 
      NATURAL JOIN district
    WHERE
      district_id=${districtId};`

  const stateObject = await db.get(getStateByDistrictQuery)
  response.send({
    stateName: stateObject.state_name,
  })
})

module.exports = app
