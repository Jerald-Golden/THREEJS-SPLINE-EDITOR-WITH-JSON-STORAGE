const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const fs = require("fs");
app.use(express.static("App"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/", (req, res) => {
    res.render("index");
});

var DataPath = "Objects.json";
var Data;

app.post("/UpdateMesh", (req, res) => {
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            Data = JSON.parse(data);
            res.json(Data);
        }
    });
});

function calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dz = point1.z - point2.z;
    return Math.sqrt(dx * dx + dz * dz);
}

app.post("/InsertCurvePoint", (req, res) => {
    const lineuuid = req.body.Id;
    const newuuid = req.body.Newid;
    const NewObject = Data.Object_Locations.find(object => object.Id === newuuid);
    // console.log(NewObject.Locations);

    const ThroughPoint = req.body.points;
    let closestNewPoint = null;
    let minDistance = Infinity;
    for (const point of ThroughPoint) {
        const distance = calculateDistance(NewObject.Locations, point);
        if (distance < minDistance) {
            minDistance = distance;
            closestNewPoint = point;
        }
    }

    // console.log("Closest:", closestNewPoint);
    // console.log("Distance:", minDistance);

    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            Data = JSON.parse(data);
            let object = Data.Line_Locations.find(element => element.Id === lineuuid);
            let PointLocations = [];
            object.Line.forEach(id => {
                // console.log(id);
                const matchingObject = Data.Object_Locations.find(object => object.Id === id);
                if (matchingObject && matchingObject.Locations) {
                    PointLocations.push(matchingObject.Locations);
                }
            });
            // console.log(PointLocations);
            let Objectpoints = [];
            PointLocations.forEach(element => {
                let closestOldPoints = null;
                let minDistance = Infinity;
                for (const point of ThroughPoint) {
                    const distance = calculateDistance(element, point);
                    if (distance < minDistance) {
                        minDistance = distance;
                        // closestOldPoints = point;
                        closestOldPoints = ThroughPoint.indexOf(point);
                    }
                }
                // console.log(ThroughPoint.indexOf(closestOldPoints));
                Objectpoints.push(closestOldPoints);
            })

            let index = ThroughPoint.indexOf(closestNewPoint);
            Objectpoints.push(index);
            Objectpoints.sort(function (a, b) { return a - b });
            // console.log(Objectpoints);
            let realindex  = (Objectpoints.indexOf(index));
            
            Data.Line_Locations.find(elements => {
                if (elements.Id === lineuuid) {
                    // console.log(realindex);
                    // console.log(newuuid);
                    let element = elements.Line;
                    element.splice((realindex),0,newuuid);
                    elements.Line = element;
                }
            })
            fs.writeFile(DataPath, JSON.stringify(Data), (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Internal Server Error");
                    return;
                }
            });

        }
    });
    res.json("done");
});




app.post("/UpdateLines", (req, res) => {
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
        } else {
            Data = JSON.parse(data);
            let lineLocations = [];
            let SeperateLines = [];
            Data.Line_Locations.forEach(element => {
                element.Line.forEach(id => {
                    const matchingObject = Data.Object_Locations.find(object => object.Id === id);
                    if (matchingObject && matchingObject.Locations) {
                        lineLocations.push(matchingObject.Locations);
                    }
                });
                SeperateLines.push({ Points: lineLocations, Id: element.Id });
                lineLocations = [];
            });
            // console.log(SeperateLines);
            res.json({ Line_Locations: SeperateLines });
        }
    });
});



app.post("/DrawLine", (req, res) => {
    fs.readFile(DataPath, 'utf-8', (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        let line = (req.body);
        Data = JSON.parse(data);
        Data.Line_Locations.push(line);
        fs.writeFile(DataPath, JSON.stringify(Data), (err) => {
            if (err) {
                console.log(err);
                res.status(500).send("Internal Server Error");
                return;
            }
            res.json(Data.Line_Locations);
        });
    });
});


app.post("/PointChoosen", (req, res) => {
    // console.log(req.body.Id);
    let Id = req.body.Id;
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
        } else {
            Data = JSON.parse(data);
            let InLines = [];
            Data.Line_Locations.forEach(element => {
                element.Line.forEach(id => {
                    if(id === Id){
                        InLines.push(element.Line);
                    }
                });
            });
            // console.log(InLines);
            res.json(InLines);
        }
    });
});

app.post("/UpdatePosition", (req, res) => {
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            Data = JSON.parse(data);
            const objectId = req.body.id;
            const newPosition = req.body.position;
            Data.Object_Locations.forEach((object) => {
                if (object.Id === objectId) {
                    object.Locations = newPosition;
                }
            });

            var jsonString = JSON.stringify(Data);
            fs.writeFileSync("Objects.json", jsonString);

            res.json("Position updated");
        }
    });
});

app.post("/Createmesh", (req, res) => {
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
        } else {
            Data = JSON.parse(data);
            const Object_Locations = req.body.position;
            const Object_Type = req.body.type;
            const Object_Id = req.body.id;
            Data.Object_Locations.push({ Locations: Object_Locations, Type: Object_Type, Id: Object_Id });
            var jsonString = JSON.stringify(Data);
            fs.writeFileSync("Objects.json", jsonString);
            res.json(Object_Type + " stored");
        }
    });
});


app.post("/removemesh", (req, res) => {
    let removedLineIds = [];
    fs.readFile(DataPath, (err, data) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
        } else {
            Data = JSON.parse(data);
            const removedId = req.body.id;
            Data.Object_Locations = Data.Object_Locations.filter(object => object.Id !== removedId);
            Data.Line_Locations = Data.Line_Locations.map(element => {
                if (element.Line.includes(removedId)) {
                    removedLineIds.push(element.Id);
                    element.Line = element.Line.filter(id => id !== removedId);
                }
                return element;
            });
            // console.log(removedLineIds);
            Data.Line_Locations = Data.Line_Locations.filter(element => element.Line.length > 1);
            var jsonString = JSON.stringify(Data);
            fs.writeFileSync("Objects.json", jsonString);

            res.json(removedLineIds);
        }
    });
});




app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});