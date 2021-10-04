const {
    MongoClient
} = require("mongodb")
const mongoose = require("mongoose")
const express = require('express')
const app = express()
const port = 3000

app.use(express.json())

mongoose.connect("mongodb://localhost:27017/restaurant", { useNewUrlParser: true })
    .then(con => console.log("DB connected"))

const menuSchema = new mongoose.Schema({
    sItem: { type: String, required: true },
    nPrice: { type: Number, required: true }
})
const menu = new mongoose.model("menus", menuSchema)

const orderSchema = new mongoose.Schema({
    sUsername: { type: String, required: true },
    aItem: { type: Array, required: true }
})
const order = new mongoose.model("orders", orderSchema)

const userSchema = new mongoose.Schema({
    sUsername: { type: String, required: true },
    nMobileno: { type: Number, required: true }
})
const user = new mongoose.model("users", userSchema)

// const url = "mongodb://localhost:27017/restaurant";
// const client = new MongoClient(url)
// client.connect();

app.get('/menu', (req, res) => {
    // console.log("getMenu API");
    menu.find({}, (err, docs) => {
        res.json(docs)
    })
})

app.post('/user', function (req, res) {
    if (!req.body.sUsername || !req.body.nMobileno) {
        return res.status(403).json({
            error: 'Please fill all details'
        });
    }

    user.findOne({ sUsername: req.body.sUsername }, (err, docs) => {
        // console.log(docs);
        if (docs) {
            return res.status(409).json({
                error: 'User already exists !'
            })
        }
        else {
            const newData = {
                sUsername: req.body.sUsername,
                nMobileno: req.body.nMobileno
            }
            user.create(newData)
            res.json(newData)
        }
    })
})

app.post('/order/place', function (req, res) {
    if (!req.body.sUsername || !req.body.aItem || req.body.sUsername==null || req.body.aItem=="") {
        return res.status(403).json({
            error: 'Please fill all details !'
        });
    }

    user.findOne({ sUsername: req.body.sUsername }, (err, docs) => {
        // console.log(docs);
        var flag = 0;
        if (docs) {
            menu.find({}, (err, docs) => {
                for (let i = 0; i < req.body.aItem.length; i++) {
                    // console.log(req.body.aItem[i]);
                    flag = 0;
                    for (let j = 0; j < docs.length; j++) {
                        if (req.body.aItem[i] == docs[j].sItem) {
                            // console.log("true");
                            flag = 1;
                        }
                    }
                    if (flag == 0) {
                        return res.status(404).json({
                            error: 'Item not available !'
                        });
                    }
                }
                if (flag == 1) {
                    const newData = {
                        sUsername: req.body.sUsername,
                        aItem: req.body.aItem
                    }
                    order.create(newData)
                        .then(data => {
                            res.json(data)
                        })
                }
            })
        }
        else {
            return res.status(401).json({
                error: 'User not exists !'
            })
        }
    })
})

app.get('/order', async (req, res) => {
    // order.find({}, (err, docs) => {
    //     res.json(docs);
    // })
    const getOrder = await order.aggregate([
        {
            $unwind: "$aItem"
        },
        {
            $lookup: {
                from: "menus",
                localField: "aItem",
                foreignField: "sItem",
                as: "other_detail"
            }
        },
        {
            $group: {
                _id: "$sUsername",
                iteams: { $push: { $first: "$other_detail.sItem" } },
                total_amount: {
                    $sum: { $first: "$other_detail.nPrice" }
                }
            }
        }
    ])
    // console.log(getOrder);
    res.json(getOrder)
})

app.listen(port, () => console.log(`app listening on port ${port}!`))