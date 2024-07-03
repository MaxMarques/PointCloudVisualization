import React, { useState } from 'react'
import './Geotiff.css';
import { Input, Box } from '@mui/material'
import GeoRasterLayer from "georaster-layer-for-leaflet"
import parseGeoraster from "georaster"
import chroma from "chroma-js"
import Img from './Input-Upload.png'
import Img2 from './importer.png'
import Img3 from './position.png'
import Img4 from './map-3d.png'
import proj4 from 'proj4'

proj4.defs([
    [
        'EPSG:4326',
        '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
    ],
    [
        'EPSG:4269',
        '+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees'
    ],
    [
        'EPSG:2154',
        '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    ]
]);

function Geotiff({ map, model3d, setModel3d }) {
    const [file, setFile] = useState();
    const [fileName, setFileName] = useState();
    const [mapClick, toggleMapClick] = React.useState(false)
    const [display, setDisplay] = useState();
    const [loadDEM, setloadDEM] = useState(false);
    
    const ref = React.useRef()
    const handleOnChange = (e) => {
        setFile(e.target.files[0])
        setFileName(e.target.files[0].name)
    };

    const onActive = () => {
        if (mapClick) {
            toggleMapClick(false)
        } else {
            toggleMapClick(true)
        }
    }

    const activeModel3d = () => {
        if (loadDEM) {
            if (model3d) {
                setModel3d(false)
            } else {
                setModel3d(true)
            }
        }
    }

    const onMapClick = (e) => {
        const latlng = [e.latlng.lng, e.latlng.lat]
        const georaster = ref?.current?.georasters[0]
        const rasterProjection = `EPSG:${georaster.projection}`
        const wgs84 = "EPSG:4326"
        const dest = proj4(wgs84, rasterProjection, latlng)
        const x = Math.floor((dest[0] - georaster.xmin) / georaster.pixelWidth)
        const y = Math.floor((georaster.ymax - dest[1]) / georaster.pixelHeight)
        setDisplay(georaster.values[0]?.at(y)?.at(x))
    }

    React.useEffect(() => {
        if (mapClick) {
          map?.on("click", onMapClick)
        } else {
          map?.off("click", onMapClick)
        }
        return () => map?.off("click", onMapClick)
    }, [mapClick, onMapClick, map])

    const handleOnSubmit = (e) => {
        e.preventDefault()

        if (file) {
            const reader = new FileReader();

            reader.onloadend = () => {
                parseGeoraster(reader.result).then(georaster => {
                    const scale = chroma.scale("Spectral").domain([georaster.mins[0], georaster.maxs[0]])
                    ref.current = new GeoRasterLayer ({
                        georaster,
                        opacity: 0.8,
                        resolution: 64,
                        pixelValuesToColorFn: (values) => {
                            if (
                              values[0] === georaster.noDataValue ||
                              scale.domain()[0] > values[0] ||
                              scale.domain()[1] < values[0]
                            ) {
                              return null
                            }
                            return scale(values[0]).hex()
                        },
                    })
                    setloadDEM(true)
                    ref.current.overlayId = "42"
                    map.addLayer(ref.current)
                    map.fitBounds(ref.current.getBounds())
                })
            }
            reader.readAsArrayBuffer(file)
        } else {
            console.log("Pas de fichier")
        }
    };

    const uploadFile = () => {
        document.getElementById('selectFile').click()
    }
  return (
    <div>
        <center>
            <button style={{backgroundColor: "white", marginTop: '30px'}} onClick={uploadFile.bind(this)}>
                <img src={Img} height="50" width="60" alt="Upload FIle..."></img>
                <br/>
                <i>Sélectionner .tiff</i>
            </button>
            <Input id="selectFile" type={"file"} style={{display: 'none'}} onChange={handleOnChange}/>
            <button style={{backgroundColor: "white", marginTop: '20px'}} onClick={(e) => { handleOnSubmit(e) }}>
                <img src={Img2} height="50" width="50" alt="Upload FIle..."></img>
                <br/>
                <i>Importer</i>
            </button>
            <br/>
            <p style={{fontSize: '22px', marginTop: '150px'}}>Votre fichier:</p>
            <p style={{color: "green"}}>{fileName}</p>
            <button style={{backgroundColor: "white", marginTop: '80px'}} onClick={() => { onActive() }}>
                <img src={Img3} height="50" width="50" alt="Upload FIle..."></img>
                <br/>
                <i>Valeur en un point</i>
                <br/>
                {mapClick ? <i style={{color: "green", fontWeight: 'bold'}}>Activé</i> : <i style={{color: "red", fontWeight: 'bold'}}>Désactivé</i>}
            </button>
            {mapClick ? 
            <Box sx={{ height: '100px',  width: '180px', borderRadius: 5, backgroundColor: 'white', marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", border: 'solid green 2px'}}>
                <i style={{color: "black", fontWeight: 'bold'}}>{display}</i>
            </Box>
            : <i></i>}
            <br/>
            <button style={{backgroundColor: "white", marginTop: '80px'}} onClick={() => { activeModel3d() }}>
                <img src={Img4} height="100" width="100" alt="Upload FIle..."></img>
                <br/>
                <i>Model Géoraster 3D</i>
                <br/>
                {model3d ? <i style={{color: "green", fontWeight: 'bold'}}>Activé</i> : <i style={{color: "red", fontWeight: 'bold'}}>Désactivé</i>}
            </button>
        </center>
    </div>
  );
}

export default Geotiff;