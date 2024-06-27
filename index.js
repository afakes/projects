
let bedrock_endpoint = "https://h2twxmk46olu65yji3okpinhpi0qoana.lambda-url.us-east-1.on.aws/";

let map = null;
let layer = null;

async function fetch_json(path) {

    // fetch json data
    let response = null;
    try {
        response = await fetch(path);
    } catch (error) {
        console.error(error);
        return null;
    }
    
    try {
        return await response.json();
    } catch (error) {
        console.error(error);
        return null;
    }
    
}


/**
 * 
 * @param {URL to GeoJSON} path 
 * @returns 
 */
async function geojsonLayer(path) {

    // fetch geojson data
    let geojson = await fetch_json(path);
    if (geojson === null) { return; }
    L.geoJson(geojson).addTo(map);
    return geojson;
}

function search_from_input(src) {
    
    if (src === null) { return; }
    if (src.value === "") { search_reset(); return; }

    search();

}

function search() {

    // get input search_text
    let search_text = document.querySelector("#search_text");
    if (search_text === null) { return; }
    
    // get text from search_text
    let text = search_text.value;

    search_reset();

    // get table
    let table = document.querySelector("#table_container > table ");
    if (table === null) { return; }

    // loop through all rows
    let rows = table.querySelectorAll("tr");
    for (let row of rows) {
        if (row.classList.contains("header")) { continue; }
        if (row.innerText.toLowerCase().includes(text.toLowerCase())) {
            row.style.display = "table-row";
        } else {
            row.style.display = "none";
        }
    }
}

function search_reset() {    
    // get table
    let table = document.querySelector("#table_container > table");
    if (table === null) { return; }

    // loop through all rows
    let rows = table.querySelectorAll("tr");

    for (let row of rows) {
        row.style.display = "table-row";
    }
}

async function do_action(src)  {

    let row = src.parentElement.parentElement;

    row.click();
    
    let comment_element = row.querySelector(".comment");
    comment_element.innerText = "fetching AI comment...";

    // get name from row 
    let name = row.querySelector("td:nth-child(4)").innerText;


    let prompt = `Please write a summary about the Australia Region know as '${name}'`;

    let ai_result = await fetchPostData(bedrock_endpoint, prompt );
    comment_element.innerText = ai_result.result;

}


function layerTable(layer, columns = null) {

    let features = layer.features || [];

    let container = document.querySelector("#table_container > table");
    if (container === null) { return; }

    let feature_one = features[0];

    let header = "";
    header += "<thead>";
    header += `<tr class="header"><th>&nbsp;</th>`;
    for (let key in feature_one.properties) { 

        if (columns !== null && !columns.includes(key)) { continue; }

        header += `<th>${key}</th>`; 
    }
    header += "<th>comments</th></tr>";
    header += "</thead>";
    container.insertAdjacentHTML('beforeend', header);

    container.insertAdjacentHTML('beforeend', "<tbody>");
    
    let feature_id = 0;
    for (let feature of features) {
        
        let geometry      = feature.geometry || {};      // get geometry
        let coordinates   = geometry.coordinates || [];  // get coordinates
        let multi_polygon = coordinates[0] || [];        // first multi_polygon
        let first_polygon = multi_polygon[0] || [];      // first polygon
        let first_point   =   first_polygon[0] || [];    // in format [longitude, latitude]

        let point = { "lat": first_point[1], "long": first_point[0], }

        let html = `<tr data-feature-id=${feature_id} data-point-lat="${point.lat}" data-long="${point.long}" >`

        // add action columns here <i class="fa-solid fa-diagram-project"></i>
        html += `<td><button name="row_action" onclick="do_action(this)" title="click to generate AI comment"><i class="fas fa-sync-alt"></i></button></td>`;

        for (let key in (feature.properties || {})) {
            if (columns !== null && !columns.includes(key)) { continue; }
            html += `<td>${feature.properties[key]}</td>`;
        }

        html += `<td class="comment"></td></tr>`
        container.insertAdjacentHTML('beforeend', html);
        feature_id += 1;
    }
    container.insertAdjacentHTML('beforeend', "</tbody>");

}

async function initMap() {
            
    // initialize leaflet map
    map = L.map('map').setView([-24,133], 5);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

    // L.marker([-24,133 ]).addTo(map)
    //     .bindPopup('Australia')
    //     .openPopup();

    layer = await geojsonLayer("data/regions_simple.geojson");

    let columns = ["STA_CODE", "REG_CODE_7", "REG_NAME_7", "SQ_KM"]
    layerTable(layer, columns);
       
    populate_statistics();


}

function addEventListenerToTable() {

    let table = document.querySelector("#table_container > table");
    if (table === null) { return; }

    table.addEventListener('click', function(event) {
        let target = event.target;

        let row = target.closest("tr");
        row.classList.add("selected");
        
        let tds = row.querySelectorAll("td");
        for (let td of tds) {
            td.classList.add("selected");
        }

        let lat = row.getAttribute("data-point-lat");
        let long = row.getAttribute("data-long");

        let name = row.querySelector("td:nth-child(4)").innerText;

        L.marker([lat, long]).addTo(map).bindPopup(name).openPopup();        
        map.setView([lat, long], 7);

        let feature = layer.features[row.getAttribute("data-feature-id")];
        feature_click(feature);
    });

}


function feature_click(feature) {

    //log feature
    console.log(feature);
}


//  create method fetch post data
async function fetchPostData(url = null, data = {}) {

    if (url == null) { return null; }

    let response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        console.error(`Failed to fetch data from ${url}`);
        return null;
    }
    
    let result = null;

    try {
        result = await response.text();
    } catch (error) {
        console.error(error);
        return null;
    }

    try {
        return {
            "result": JSON.parse(result),
            "type": "json"
        };
    } catch (error) {
        return {
            "result": result,
            "type": "text"
        };
    }
}


function populate_statistics() {

    // #num_regions
    let num_regions = layer.features.length;
    let num_regions_element = document.querySelector("#num_regions");
    if (num_regions_element !== null) {
        num_regions_element.innerText = num_regions;
    }

    // num_polygons
    let num_polygons = 0;
    for (let feature of layer.features) {
        let geometry = feature.geometry || {};
        let coordinates = geometry.coordinates || [];
        num_polygons += coordinates.length;
    }
    let num_polygons_element = document.querySelector("#num_polygons");
    if (num_polygons_element !== null) {
        num_polygons_element.innerText = num_polygons;
    }

    // num_points
    let num_points = 0;
    for (let feature of layer.features) {
        let geometry = feature.geometry || {};
        let coordinates = geometry.coordinates || [];
        for (let multi_polygon of coordinates) {
            for (let polygon of multi_polygon) {
                num_points += polygon.length;
            }
        }
    }
    let num_points_element = document.querySelector("#num_points");
    if (num_points_element !== null) {
        num_points_element.innerText = num_points;
    }



}

async function main() {
    
    
    // // initialize map
    // initMap();
    
    // // add click event listener to table 
    // addEventListenerToTable();


}
