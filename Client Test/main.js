async function getData() {
    const response = await axios.get("http://44.247.151.69:5000/");
    
    console.log(response.data);
    return response.data;
}