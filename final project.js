const http = require("http");
const https = require("https");
const fs = require("fs");
const { connected } = require("process");
const port = 3000;
const server = http.createServer();
const battuta_key = '48c30b472cf05a95f3874d9a7c13e30c';

server.on("listening", listen_handler);
server.listen(port);
function listen_handler(){
    console.log(`Now Listening On Port ${port}`);
}

server.on("request", request_handler);
function request_handler(req, res){
    console.log(`New Request From ${req.socket.remoteAddress} for ${req.url}`);

    if(req.url === "/"){
        const form = fs.createReadStream("./index.html");
        res.writeHead(200, {"Content-Type": "text/html"})
        form.pipe(res);
    }else if(req.url.startsWith("/search")){
        const user_input = new URL(req.url, `https://${req.headers.host}`).searchParams;
        let country = user_input.get('country');
        res.writeHead(200, {"Content-Type": "text/html"});
		get_information(country, res);
    }else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end(`<h1>404 Not Found</h1>`);
    }
}

function get_information(country, res){
    const battuta_endpoint = `https://battuta.medunes.net/api/country/search/?key=${battuta_key}&country=${country}`;
    const battuta_request = https.get(battuta_endpoint);
    battuta_request.on("response", battuta_stream => process_stream(battuta_stream, parse_battuta, res));
    
}
function process_stream(stream, callback, ...args){
    let data_stream = "";
    stream.on("data", chunk => data_stream += chunk);
    stream.on("end", () =>callback(data_stream, ...args));
    
}

function parse_battuta(battuta_data, res){
    let battuta_obj = JSON.parse(battuta_data);
    let result1;
    if(Array.isArray(battuta_obj) && battuta_obj.length != 0){
        let country_name = battuta_obj[0]?.name;
        let country_code =battuta_obj[0]?.code;
        result1 = `<h3>Country: ${country_name}</h3><d1>Country Code: ${country_code}</d1>`;
        const nager_endpoint = `https://date.nager.at/api/v3/NextPublicHolidays/${country_code}`;
        const nager_request = https.get(nager_endpoint);
        nager_request.on("response", nager_stream => process_stream(nager_stream, parse_nager, res));
        result1 = `<div style="width:49%; float:right;">${result1}</div>`
        res.write(result1.padEnd(1024, " "));
    }else{
        result1 = "<h1>We cannot find any results. Maybe you need a cup of coffee :)</h1>";
        res.write(result1.padEnd(1024, " "));
        res.end();// close res if cannot find a matched country code
    }
}
function parse_nager(nager_data, res){
    let nager_objs = JSON.parse(nager_data);
    let result2 = "";
    if(Array.isArray(nager_objs)){
        for( let i = 0; i < nager_objs.length; i++){
            result2 += generate_holidays(nager_objs[i]);
        }
    }else{
        result2 = "<h1>No Holidays Found</h1>";
    }
    result2 = `<div style="width:49%; float:left;">${result2}</div>`
    res.write(result2.padEnd(1024, " "));
    res.end();
    function generate_holidays(nager_element){
        let date = nager_element?.date;
        let name = nager_element?.name;
        let type = nager_element?.types[0];
        return `<h3> Date: ${date} </h3><h3>${name}</h3><h3>${type} Holiday</h3> <br>`;
    }
}