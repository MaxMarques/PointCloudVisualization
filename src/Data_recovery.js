import * as React from 'react'
import parseGeoraster from 'georaster'
import GeoRasterLayer from "georaster-layer-for-leaflet"
import chroma from "chroma-js"
import proj4 from 'proj4'

import Img from './Input-Upload.png'
import Img2 from './importer.png'
import Img3 from './rectangle.png'
import Img4 from './map-3d.png'

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
    ],
    [
        'EPSG:3857',
        '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs'
    ],
    [
        'EPSG:32631',
        '+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs'
    ]
]);

class SteamDataRaster {
    #i
    #j
    #data
    #interval
    #pixH
    #pixW
    #xMin
    #yMax
    constructor(raster, delay, speed) {
      this.#data = raster.values[0]
      this.delay = delay
      this.speed = speed
      this.#i = 0
      this.#j = 0
      this.#pixH = raster.pixelHeight
      this.#pixW = raster.pixelWidth
      this.#xMin = raster.xmin
      this.#yMax = raster.ymax
    }
    start(controller) {

      this.#interval = setInterval(() => {
          let counter = 0
        while (counter++ < this.speed) {
            if (this.#j > this.#data[this.#i].length - 1) {
                this.#j = 0
                this.#i++
            }
            if (this.#i > this.#data.length - 1) {
                clearInterval(this.#interval)
                controller.close()
                return
            }
            const res = {
                value: this.#data[this.#i][this.#j],
                x: this.#j * this.#pixW + this.#xMin,
                y: this.#yMax - this.#i * this.#pixH
            }
            controller.enqueue(res)
            this.#j++
        }
      }, this.delay)
    }
    cancel() {
      clearInterval(this.#interval)
    }
}

async function myStream(raster, newRaster, ref) {
    const stream = new ReadableStream(new SteamDataRaster(raster, 1, 1000))
    const reader = stream.getReader()
    const newRasterProjection = `EPSG:${newRaster.projection}`
    const rasterProjection = `EPSG:${raster.projection}`

    const pixelValuesToColorFn = (min, max) => {
        const scale = chroma.scale("Spectral").domain([min, max])
        return (values) => {
            if (
                values[0] === newRaster.noDataValue ||
                scale.domain()[0] > values[0] ||
                scale.domain()[1] < values[0]
            ) {
                return null
            }
            return scale(values[0]).hex()
        }
    }


    const intervalId = setInterval(() => {
        ref.current.updateColors(pixelValuesToColorFn(newRaster.mins[0], newRaster.maxs[0]))
    }, 1000)

    while (true) {
        const { value, done } = await reader.read()
            if (done) {
                clearInterval(intervalId)
            return
        }
        const dest = proj4(rasterProjection, newRasterProjection, [value.x, value.y])
        const i = Math.round((dest[0] - newRaster.xmin) / newRaster.pixelWidth)
        const j = Math.round((newRaster.ymax - dest[1]) / newRaster.pixelHeight)

        if (i >= 0 && i < newRaster.values[0][0].length && j >= 0 && j < newRaster.values[0].length) {
            newRaster.values[0][j][i] = value.value
            ref.current.georasters[0].values[0][j][i] = value.value
            ref.current.rasters[0][j][i] = value.value
            ref.current.georasters[0].xmin = newRaster.xmin
            ref.current.georasters[0].xmax = newRaster.xmax
            ref.current.georasters[0].ymin = newRaster.ymin
            ref.current.georasters[0].ymax = newRaster.ymax
            ref.current.currentStats.mins = newRaster.mins
            ref.current.currentStats.maxs = newRaster.maxs
    
            if (value.value !== newRaster.noDataValue) {
                newRaster.mins[0] = Math.min(value.value, newRaster.mins[0] ?? value.value)
                newRaster.maxs[0] = Math.max(value.value, newRaster.maxs[0] ?? value.value)
            }
        }
    }
}

function initRaster(raster, minmanRec, multiPixel) {
    const latlng1 = [minmanRec[0][1], minmanRec[0][0]]
    const latlng2 = [minmanRec[1][1], minmanRec[1][0]]
    const rasterProjection = `EPSG:${raster.projection}`
    const wgs84 = "EPSG:4326"
    const dest1 = proj4(wgs84, rasterProjection, latlng1)
    const dest2 = proj4(wgs84, rasterProjection, latlng2)
    const parseGeoraster = require("georaster");
    const noDataValue = raster.noDataValue
    const projection = raster.projection
    const xmin = Math.min(dest1[0], dest2[0])
    const ymax = Math.max(dest1[1], dest2[1]) 
    const pixelWidth = multiPixel * raster.pixelWidth
    const pixelHeight = multiPixel * raster.pixelHeight
    const width = Math.floor((dest2[0] - dest1[0]) / pixelWidth)
    const height = Math.floor((dest1[1] - dest2[1]) / pixelHeight)
    let val = []
    for (let i = 0; i <= height; i++) {
        val.push([])
        for (let j = 0; j <= width; j++) {
            val[i].push(noDataValue)
        }
    }
    const values = [val]
    const metadata = { noDataValue, projection, xmin, ymax, pixelWidth, pixelHeight }

    return parseGeoraster(values, metadata)
}

function Creat_Layer(ref, newRaster, map, setloadDEM) {
    ref.current = new GeoRasterLayer ({
        georaster: newRaster,
        opacity: 0.8,
        resolution: 64,
        pixelValuesToColorFn: (values) => {
            if (values[0] === newRaster.noDataValue)
                return null
        },
    })
    setloadDEM(true)
    ref.current.overlayId = "42"
    map.addLayer(ref.current)
    map.fitBounds(ref.current.getBounds())
}

function Data_recovery({ map, setRectangle, model3d, setModel3d}) {
    const [upload, setUpload] = React.useState();
    const [filename, setFilename] = React.useState();
    const [message, setMessage] = React.useState();
    const [error, setError] = React.useState();
    const [newRaster, setNewRaster] = React.useState();
    const [original, setOriginal] = React.useState();
    const [mapClick, toggleMapClick] = React.useState(false)
    const [latlng1, setLatlng1] = React.useState()
    const [latlng2, setLatlng2] = React.useState()
    const [minmanRec, setMinmanRec] = React.useState()
    const [val, setVal] = React.useState()
    const [multiPixel, setMultiPixel] = React.useState()
    const [loadDEM, setloadDEM] = React.useState(false);

    const ref = React.useRef()

    const activeModel3d = () => {
        if (loadDEM) {
            if (model3d) {
                setModel3d(false)
            } else {
                setModel3d(true)
            }
        }
    }

    const uploadFile = () => {
        document.getElementById('selectFile').click()
    }

    const handleOnChange = (e) => {
        setUpload(e.target.files[0])
        setFilename(e.target.files[0].name)
    };
                    
    const handleOnSubmit = () => {
        if (upload) {
            setError(null)
            const reader = new FileReader();

            reader.onloadend = () => {
                parseGeoraster(reader.result).then(raster => {
                    setOriginal(raster)
                    initRaster(raster, minmanRec, multiPixel).then(setNewRaster)
                })
            }
            reader.readAsArrayBuffer(upload)
            setMessage("Fichier importé !")
        } else {
            setError("Aucun fichier !")
        }
    };

    React.useEffect(() => {
        if (newRaster) {
            Creat_Layer(ref, newRaster, map, setloadDEM)
            myStream(original, newRaster, ref)
        }
    }, [newRaster])

    const onActive = () => {
        if (mapClick) {
            setRectangle([])
            toggleMapClick(false)
        } else {
            toggleMapClick(true)
        }
    }

    const onMapClick = (e) => {
        const latlng = [e.latlng.lat, e.latlng.lng]
        setLatlng1(latlng)
        map?.off("click", onMapClick)
    }

    const onMapClick2 = (e) => {
        const latlng = [e.latlng.lat, e.latlng.lng]
        setLatlng2(latlng)
        map?.off("click", onMapClick2)
    }

    React.useEffect(() => {
        if (mapClick) {
            if (latlng1 === undefined) {
                map?.on("click", onMapClick)
            } else if (latlng2 === undefined) {
                map?.on("click", onMapClick2)
            }
            if (latlng1 !== undefined && latlng2 !== undefined) {
                const rect = [
                    [latlng1[0], latlng1[1]],
                    [latlng2[0], latlng2[1]],
                ]
                setRectangle(rect)
                setMinmanRec(rect)
            }
        } else {
            setLatlng1(undefined)
            setLatlng2(undefined)
            map?.off("click", onMapClick)
            map?.off("click", onMapClick2)
        }
        return () => map?.off("click", onMapClick)
    }, [mapClick, onMapClick, map])

  return (
    <div>
        <center>
            <button style={{backgroundColor: "white", marginTop: '30px'}} onClick={uploadFile.bind(this)}>
                <img src={Img} height="50" width="60" alt="Upload FIle..."></img>
                <br/>
                <i>Sélectionner .tiff</i>
            </button>
            <input id="selectFile" type={"file"} style={{display: 'none'}} onChange={handleOnChange}/>
            <p style={{fontSize: '22px', marginTop: '10px', color: "#D2D2D2"}}>Votre fichier:</p>
            <p style={{color: "#FAC900"}}>{filename}</p>
            <button style={{backgroundColor: "white", marginTop: '10px'}} onClick={handleOnSubmit}>
                <img src={Img2} height="50" width="50" alt="Upload FIle..."></img>
                <br/>
                <i>Importer</i>
            </button>
            {error ? <p style={{color: "red"}}>{error}</p> : <p style={{color: "#87FF00"}}>{message}</p>}
            <button style={{backgroundColor: "white", marginTop: '80px'}} onClick={onActive}>
                <img src={Img3} height="50" width="50" alt="Upload FIle..."></img>
                <br/>
                {mapClick ? <i style={{color: "green", fontWeight: 'bold'}}>Activé</i> : <i style={{color: "red", fontWeight: 'bold'}}>Désactivé</i>}
            </button>
            <br/>
            <label>
                <input type="number" onChange={(v) => setVal(v.target.value)}/>
            </label>
            <input type="submit" value="OK" onClick={() => setMultiPixel(val)}/>
            <button style={{backgroundColor: "white", marginTop: '30px'}} onClick={() => { activeModel3d() }}>
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

export default Data_recovery;