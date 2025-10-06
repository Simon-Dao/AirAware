// const serverURL = "http://44.247.151.69:5000/"
const serverURL = "http://192.168.0.16:5000/"

async function getData() {
    const response = await axios.get("");
    
    console.log(response.data);
    return response.data;
}