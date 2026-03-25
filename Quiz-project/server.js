const express = require("express")
const mysql = require("mysql2")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())

const db = mysql.createConnection({
host:"localhost",
user:"root",
password:"",
database:"coding with cats"
})

db.connect(err => {

if(err){
console.log(err)
return
}

console.log("Database connected")

})

app.post("/add-score",(req,res)=>{

const {name, username, score} = req.body

const sql = "INSERT INTO leaderboards (student, stage, score, rank) VALUES (?,?,?,?)"

db.query(sql,[name,username,score,rank],(err,result)=>{

if(err){
res.send(err)
return
}

res.send("Score added")

})

})

app.get("/leaderboards",(req,res)=>{

const sql = "SELECT * FROM leaderboards ORDER BY score DESC LIMIT 10"

db.query(sql,(err,result)=>{

if(err){
res.send(err)
return
}

res.json(result)

})

})

app.listen(3000,()=>{

console.log("Server running on port 3000")

})