import { useEffect, useState } from "react";
import axios from "axios";

function App() {
    const [data, setData] = useState<string>("loading...");

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await axios.get("http://44.247.151.69:5000/");
                setData(response.data.PM10.toString());
            } catch (error) {
                setData("Error fetching data");
                console.error("Failed to fetch data:", error);
            }
        }, 1000);

        // Cleanup on unmount
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div>
                <h1 className="response">{data}</h1>
            </div>
        </>
    );
}

export default App;
