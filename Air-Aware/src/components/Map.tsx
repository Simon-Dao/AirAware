import { useEffect, useRef, useState } from "react";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

function Map() {
    const mapRef = useRef(null);
    const [positon, setPosition] = useState<number[]>([0,0]);
    
    useEffect(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            setPosition([latitude, longitude]);
        });
    },[]);

    return (
        <MapContainer style={{width:'500px', height:'500px'}} center={[latitude, longitude]} zoom={13} scrollWheelZoom={false}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[latitude, longitude]}>
                <Popup>
                    A pretty CSS3 popup. <br /> Easily customizable.
                </Popup>
            </Marker>
        </MapContainer>
    );
}

export default Map;
