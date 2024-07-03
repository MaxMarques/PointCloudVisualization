import React, { useState } from 'react'
import './App.css';
import { Box } from '@mui/material'
import Map from './Map'
import Map_Data_Recovery from './Map_Data_recovery'
import Geotiff from './Geotiff'
import ThreeModel from './ThreeModel'
import DataRecovery from './Data_recovery'
import ThreeModel_Data_recovery from './ThreeModel_Data_recovery'

function App() {
  const [map, setMap] = useState(null)
  const [model3d, setModel3d] = useState(false)
  const [rectangle, setRectangle] = useState([])
  const [proj1, setProj1] = useState(false)
  const [proj2, setProj2] = useState(false)

  return (
    <div style={{ width: '100%'}}>
      <Box sx={{ height: '100vh',  width: '100vw', display: 'flex', flexDirection: 'row', borderRadius: 1}}>
        {/* <div style={{height: '100vh', width: '20vw'}}>
          <Geotiff map={map} model3d={model3d} setModel3d={setModel3d}/>
        </div>
        <div style={{height: '100vh', width: '80vw'}}>
          <Map setMap={setMap}/>
          {model3d ? <ThreeModel map={map}/> : <i></i>}
        </div> */}
        <div style={{height: '100vh', width: '20vw', backgroundColor: '#323432', border: "solid #FAC900 2px"}}>
          <DataRecovery map={map} setRectangle={setRectangle} model3d={model3d} setModel3d={setModel3d}/>
        </div>
        <div style={{height: '100vh', width: '80vw'}}>
          <Map_Data_Recovery setMap={setMap} rectangle={rectangle}/>
          {model3d ? <ThreeModel_Data_recovery map={map}/> : <i></i>}
        </div>
      </Box>
    </div>
  );
}

export default App;