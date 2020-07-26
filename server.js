const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const Clarifai = require('clarifai');
const { response } = require('express');

//knex to connect database to server and 'pg' postgresql database
//127.0.0.1 is localhost - theres no place like home!
const db = knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'test',
      database : 'smart-brain'
    }
  });

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res)=> {
    res.send(database.users);
})

/*sign in component testing on postman remember using json so parse email addresses*/
//bcrypt synchronous package for hashing passwords
//bcrypt synchronous remember js does not get executed on the next line
app.post('/signin',(req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json('incorrect form submission');
    }
        db.select('email', 'hash').from('login')
            .where('email', '=', email)
            .then(data => {
            const isValid = bcrypt.compareSync(password, data[0].hash);
                if (isValid) {
                    return db.select('*').from('users')
                    .where('email', '=', req.body.email)
                    .then(user => {
                        res.json(user[0])   
                    })
                    .catch(err => res.status(400).json('unable to get user'))
                } else {
                    res.status(400).json('wrong credentials')
                }
            })
            .catch(err => res.status(400).json('wrong credentials'))
})

/*register component*/
//create a transaction as doing more than 1 thing - trx insert into login/return email/insert into users
app.post('/register', (req, res) => {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
        return res.status(400).json('incorrect form submission');
    }
    const hash = bcrypt.hashSync(password);
        db.transaction(trx => {
            trx.insert({
                hash: hash,
                email: email
            })
            .into('login')
            .returning('email')
            .then(loginEmail => {
                return trx('users')
                .returning('*')
                .insert({
                    email: loginEmail[0],
                    name: name,
                    joined: new Date()  
                })
                .then(user => {
                res.json(user[0]);
                })
            })
            .then(trx.commit)
            .catch(trx.rollback)
        })         
        .catch(err => res.status(400).json('unable to register'))
   })

/*profile component*/
app.get('/profile/:id', (req, res)=> {
    const { id } = req.params;
    db.select('*').from('users').where({id})
        .then(user => {
            if (user.length) {
            res.json(user[0])
            } else {
                res.status(400).json('not found')  
            }
    }) 
    .catch(err => res.status(400).json('error getting user'))
})

//clarifai API key
const Clarifyapp = new Clarifai.App({
    apiKey: 'ba86138515564a14ada98af031fbe4de'
   });

const handleApiCall = (req, res) => {
    Clarifyapp.models
        .predict(Clarifai.FACE_DETECT_MODEL, req.body.input)
        .then(data => {
            res.json(data);
        })
        .catch(err => res.status(400).json('unable to work with API'))
}

/*image component*/
app.put('/image', (req, res) => {
    const { id } = req.body;
    db('users').where('id', '=', id)
    .increment('entries', 1)
    .returning('entries')
    .then(entries => {
        res.json(entries[0]);
    })
    .catch(err => res.status(400).json('unable to get entries'))
})

app.post('/imageurl', (req, res) => {
    handleApiCall(req, res);
})

app.listen(3000, ()=> {        
    console.log('app is running on port 3000');
})


/*
/api planning notes --> res - this is working
/testing done with Postman
/signin --> POST request responding = success/fail
/register --> POST request responding = user
/profile/:userId --> GET request responding = user
/when a user posts multi pics keep track of them by using:
   /image --> PUT --> user
*/
