import 'dotenv/config'
import express from "express";
import cors from 'cors';
import pg from 'pg';
import bodyParser from "body-parser";
import bcrypt, { hash } from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';


const saltRounds = 4;
const app = express();
app.use(cors());
const port = 3000;
app.use(bodyParser.json());

const db = new pg.Client({
    connectionString: process.env.connectionString,
});

db.connect();

app.post("/register", async (req, res) => {
    console.log(req.body);
    let { username, password } = req.body;
    if ((await db.query(`select * from users where username = '${username}'`)).rows[0] == null) {
        bcrypt.hash(password, saltRounds, async (err, hashedPassword) => {
            if (err) {
                console.log("error" + err);
                res.send("Error occured");
            }
            else {
                await db.query(`insert into users(username, password) values('${username}','${hashedPassword}')`);
                res.status(200);
                res.send("Registered Successfully");
            }
        })
    }
    else {
        res.status(500);
        res.send("username already taken");
    }
});

app.post('/edit', async (req, res) => {
    // console.log(req.body);
    let { post, title, id } = req.body
    await db.query(`update blog set post = '${post}', title='${title}' where id=${id}`)
    res.send()
})

app.post('/session', async (req, res) => {
    let user = '';
    if (req.body.sessionID) {
        let prevId = (await db.query(`select username from users where sessionID = '${req.body.sessionID}'`));
        prevId = prevId.rows[0];
        console.log(prevId);
        if (prevId != null) {
            user = prevId.username;
            console.log(user);
            res.send(user);
        }
    }
})

app.post("/login", async (req, res) => {

    console.log(req.body);
    let { username, password } = req.body;
    let hashedPassword = ((await db.query(`select password from users where username = '${username}' `)).rows[0]);
    if (hashedPassword == null) {
        res.send('user not registered');
    }
    else {
        hashedPassword = hashedPassword.password
        bcrypt.compare(password, hashedPassword, async (err, result) => {
            if (err) {
                console.log(err);
            }
            if (result == false) {
                res.send('wrong password')
            }
            if (result == true) {
                const sessionId = uuidv4();
                await db.query(`update users set sessionid = '${sessionId}' where username = '${username}'`);
                res.send(sessionId);
            }
        })
    }
})

app.post('/logout', async (req, res) => {
    await db.query(`update users set sessionid = null where username = '${req.body.username}'`)

    // console.log(q);
    res.send();
})

app.get('/', (req, res) => {
    // console.log(process.env.abc);
    db.query("select * from blog").then((resp) => {
        res.send(resp.rows);
    });
});
app.post("/del", async (req, res) => {
    await db.query(`delete from blog where id = ${req.body.id};`);
    res.send();
});
app.post('/create', async (req, res) => {
    console.log(req.body);
    await db.query(`insert into blog(post, title, author) values('${req.body.post}','${req.body.title}','${req.body.author}')`);
    res.send();
});
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});